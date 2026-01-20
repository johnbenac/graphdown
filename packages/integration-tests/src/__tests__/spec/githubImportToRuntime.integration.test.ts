import { afterEach, describe, expect, it, vi } from "vitest";

import { loadGitHubSnapshot } from "@graphdown/io-github";
import { validateDatasetSnapshot } from "@graphdown/core";
import { openRuntimeApiV1 } from "@graphdown/runtime";

const jsonResponse = (data: unknown) =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });

describe("integration: io-github -> selection -> core validation -> runtime open", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("imports from a stubbed GitHub repo, validates, and opens runtime API", async () => {
    // Use the well-known CID for an empty sha2-256 block.
    // This is the exact CID referenced in the core plugin fixture.
    const EMPTY_BLOCK_CID =
      "bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku";
    const EMPTY_BLOCK_PATH = `blocks/sha2-256/e3/${EMPTY_BLOCK_CID}`;

    // Graphdown type + record (minimal valid dataset)
    const typeNoteMd = ["---", "typeId: note", "fields: {}", "---", "# Note Type", ""].join("\n");

    const recordOneMd = [
      "---",
      "typeId: note",
      "recordId: one",
      "fields:",
      '  title: "One"',
      "---",
      "",
      "# One",
      ""
    ].join("\n");

    // Plugin manifest that forces stage-2 bundle fetch:
    // - ui.md is markdown (downloaded in stage 1)
    // - entry.js is non-md (must be downloaded in stage 2)
    // - logo.png is non-md binary (must be downloaded in stage 2)
    // Also includes a block reference to the empty block CID.
    const pluginManifestMd = [
      "---",
      "pluginId: demo",
      "gdApiVersion: 1",
      "entry: entry.js",
      "files:",
      "  - entry.js",
      "  - ui.md",
      "  - logo.png",
      "binaryFiles:",
      "  - logo.png",
      "blocks:",
      `  - ${EMPTY_BLOCK_CID}`,
      "---",
      "",
      "Demo plugin manifest for integration test.",
      ""
    ].join("\n");

    const pluginUiMd = ["# Demo Plugin UI", "", "This is a plain markdown file.", ""].join("\n");
    const pluginEntryJs = ["export function activate() {", "  return { ok: true };", "}", ""].join(
      "\n"
    );
    const pluginLogoPngBytes = new Uint8Array([0, 1, 2, 3]);

    const docsReadmeMd = ["# readme", "", "This should be ignored by snapshot selection.", ""].join(
      "\n"
    );

    const owner = "owner";
    const repo = "repo";
    const branch = "main";

    const fetchMock = vi.fn(async (input: string | URL | Request, _init?: RequestInit) => {
      const urlString =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      // 1) Repo metadata
      if (urlString === `https://api.github.com/repos/${owner}/${repo}`) {
        return jsonResponse({ default_branch: branch });
      }

      // 2) Repo tree listing
      if (
        urlString ===
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
      ) {
        return jsonResponse({
          tree: [
            { path: "types/note.md", type: "blob" },
            { path: "records/note/one.md", type: "blob" },

            { path: "extensions/demo/plugin.md", type: "blob" },
            { path: "extensions/demo/ui.md", type: "blob" },

            // Non-md plugin bundle files (must be fetched in stage 2)
            { path: "extensions/demo/entry.js", type: "blob" },
            { path: "extensions/demo/logo.png", type: "blob" },

            // Block file
            { path: EMPTY_BLOCK_PATH, type: "blob" },

            // Noise / ignored paths
            { path: "docs/readme.md", type: "blob" },
            { path: "assets/logo.png", type: "blob" }
          ]
        });
      }

      // 3) Raw content fetches
      const rawPrefix = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/`;
      if (urlString.startsWith(rawPrefix)) {
        const path = urlString.slice(rawPrefix.length);

        if (path === "types/note.md") return new Response(typeNoteMd, { status: 200 });
        if (path === "records/note/one.md") return new Response(recordOneMd, { status: 200 });

        if (path === "extensions/demo/plugin.md")
          return new Response(pluginManifestMd, { status: 200 });
        if (path === "extensions/demo/ui.md") return new Response(pluginUiMd, { status: 200 });

        // stage 2 fetches (non-md bundles)
        if (path === "extensions/demo/entry.js") return new Response(pluginEntryJs, { status: 200 });
        if (path === "extensions/demo/logo.png")
          return new Response(pluginLogoPngBytes, { status: 200 });

        if (path === EMPTY_BLOCK_PATH) return new Response(new Uint8Array(), { status: 200 });

        if (path === "docs/readme.md") return new Response(docsReadmeMd, { status: 200 });
      }

      // Any unexpected URL should fail the test immediately (prevents accidental network dependence).
      return new Response(`Unexpected URL in test fetchMock: ${urlString}`, { status: 500 });
    });

    // Act: GitHub import (this includes semantic selection internally)
    const { snapshot, ignored } = await loadGitHubSnapshot({
      owner,
      repo,
      fetch: fetchMock
    });

    // Assert: snapshot contains the dataset + plugin bundles + block
    const snapshotPaths = [...snapshot.files.keys()].sort((a, b) => a.localeCompare(b));
    expect(snapshotPaths).toEqual(
      [
        EMPTY_BLOCK_PATH,
        "extensions/demo/entry.js",
        "extensions/demo/logo.png",
        "extensions/demo/plugin.md",
        "extensions/demo/ui.md",
        "records/note/one.md",
        "types/note.md"
      ].sort((a, b) => a.localeCompare(b))
    );

    // Assert: ignored paths are reported (markdown noise + non-md noise)
    expect(ignored).toEqual(["assets/logo.png", "docs/readme.md"]);

    // Assert: core validation passes
    const validation = validateDatasetSnapshot(snapshot);
    expect(validation.ok).toBe(true);

    // Assert: runtime opens
    const runtimeResult = await openRuntimeApiV1({ snapshot });
    expect(runtimeResult.ok).toBe(true);

    if (!runtimeResult.ok) return; // keeps TS happy in strict mode
    const api = runtimeResult.value;

    // Assert: basic runtime behavior
    expect(await api.listTypeIds()).toEqual(["note"]);
    expect(await api.listRecordKeysByType("note")).toEqual(["note:one"]);

    const rec = await api.getRecord("note:one");
    expect(rec).not.toBeNull();
    expect(rec?.typeId).toBe("note");
    expect(rec?.recordId).toBe("one");
    expect(rec?.recordKey).toBe("note:one");
    expect(rec?.fields).toEqual({ title: "One" });
    expect(rec?.body).toMatch(/# One/);

    // Assert: plugin blocks are considered reachable (runtime includes plugin manifest blocks)
    const reachable = await api.listReachableBlockCids();
    expect(reachable).toContain(EMPTY_BLOCK_CID);

    // Assert: the block exists and round-trips through runtime
    expect(await api.hasBlock(EMPTY_BLOCK_CID)).toBe(true);
    const bytes = await api.getBlockBytes(EMPTY_BLOCK_CID);
    expect(bytes).not.toBeNull();
    if (!bytes) return;
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(0);
  });
});
