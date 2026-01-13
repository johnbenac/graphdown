import { afterEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadGitHubSnapshot } from "../loadGitHubSnapshot";

const jsonResponse = (data: unknown) =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });

describe("loadGitHubSnapshot plugin bundles", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("IMP-PLUG-001: fetches plugin bundles (including non-md) and includes them in snapshot.files", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const manifestUrl = new URL(
      "../../../../../../packages/core/src/__fixtures__/plugin-valid-dataset/extensions/demo/plugin.md",
      import.meta.url
    );
    const manifestPath =
      manifestUrl.protocol === "file:"
        ? fileURLToPath(manifestUrl)
        : path.resolve(
            process.cwd(),
            "..",
            "..",
            "packages/core/src/__fixtures__/plugin-valid-dataset/extensions/demo/plugin.md"
          );
    const manifestBytes = new Uint8Array(await readFile(manifestPath));

    const rawFiles = new Map<string, Uint8Array>([
      [
        "types/note.md",
        new TextEncoder().encode(
          ["---", "typeId: note", "fields:", "  title:", "    required: true", "---"].join("\n")
        )
      ],
      [
        "records/note/record-1.md",
        new TextEncoder().encode(
          ["---", "typeId: note", "recordId: one", "fields: {}", "---"].join("\n")
        )
      ],
      ["extensions/demo/plugin.md", manifestBytes],
      ["extensions/demo/ui.md", new TextEncoder().encode("# ui bundle")],
      ["extensions/demo/entry.js", new TextEncoder().encode("console.log('entry');")],
      ["docs/readme.md", new TextEncoder().encode("# readme")],
      ["assets/logo.png", new Uint8Array([1, 2, 3])]
    ]);

    fetchMock.mockImplementation(async (url) => {
      if (typeof url !== "string") {
        throw new Error("Unexpected non-string URL");
      }
      if (url.startsWith("https://api.github.com/repos/owner/repo")) {
        if (url.includes("/git/trees/")) {
          return jsonResponse({
            tree: [
              { path: "types/note.md", type: "blob" },
              { path: "records/note/record-1.md", type: "blob" },
              { path: "extensions/demo/plugin.md", type: "blob" },
              { path: "extensions/demo/ui.md", type: "blob" },
              { path: "extensions/demo/entry.js", type: "blob" },
              { path: "docs/readme.md", type: "blob" },
              { path: "assets/logo.png", type: "blob" }
            ]
          });
        }
        return jsonResponse({ default_branch: "main" });
      }
      if (url.startsWith("https://raw.githubusercontent.com/owner/repo/main/")) {
        const path = url.replace("https://raw.githubusercontent.com/owner/repo/main/", "");
        const bytes = rawFiles.get(path);
        if (!bytes) {
          return new Response("not found", { status: 404 });
        }
        return new Response(bytes, { status: 200 });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const { snapshot, ignored } = await loadGitHubSnapshot({ owner: "owner", repo: "repo" });

    expect(snapshot.files.has("extensions/demo/plugin.md")).toBe(true);
    expect(snapshot.files.has("extensions/demo/ui.md")).toBe(true);
    expect(snapshot.files.has("extensions/demo/entry.js")).toBe(true);
    expect(ignored.sort()).toEqual(["assets/logo.png", "docs/readme.md"].sort());

    const uiCalls = fetchMock.mock.calls.filter(
      ([url]) => typeof url === "string" && url.includes("/extensions/demo/ui.md")
    );
    expect(uiCalls).toHaveLength(1);

    const entryCalls = fetchMock.mock.calls.filter(
      ([url]) => typeof url === "string" && url.includes("/extensions/demo/entry.js")
    );
    expect(entryCalls.length).toBeGreaterThan(0);
  });
});
