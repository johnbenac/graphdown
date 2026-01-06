import { describe, expect, it, vi, afterEach } from "vitest";
import { loadGitHubSnapshot } from "./loadGitHubSnapshot";
import { PluginManifestError } from "../../core/uiPluginArtifacts";
import { expectPartitionedImport } from "../testHelpers";

const jsonResponse = (data: unknown) =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });

describe("loadGitHubSnapshot", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("GH-008: does not send Authorization headers for public fetches", async () => {
    const tree = [
      { path: "types/note.md", type: "blob" },
      { path: "records/note/record-1.md", type: "blob" }
    ];
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    fetchMock
      // Repo metadata
      .mockResolvedValueOnce(jsonResponse({ default_branch: "main" }))
      // Tree listing
      .mockResolvedValueOnce(
        jsonResponse({
          tree
        })
      )
      // Raw file fetches
      .mockResolvedValueOnce(
        new Response(
          ["---", "typeId: note", "fields: {}", "---"].join("\n"),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response(["---", "typeId: note", "recordId: one", "fields: {}", "---"].join("\n"), { status: 200 }));

    const { snapshot, ignored } = await loadGitHubSnapshot({ owner: "owner", repo: "repo" });

    expectPartitionedImport({
      sourcePaths: tree.map((entry) => entry.path),
      includedPaths: snapshot.files.keys(),
      ignored
    });

    // All fetch calls should omit Authorization headers
    for (const [, options] of fetchMock.mock.calls) {
      const headers =
        (options as RequestInit | undefined)?.headers &&
        new Headers((options as RequestInit).headers as HeadersInit);
      expect(headers?.has("authorization")).not.toBe(true);
    }
  });

  it("GH-002: falls back to main when default_branch is missing", async () => {
    const tree = [
      { path: "types/note.md", type: "blob" },
      { path: "records/note/record-1.md", type: "blob" }
    ];
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    fetchMock
      // Repo metadata (no default_branch)
      .mockResolvedValueOnce(jsonResponse({}))
      // Tree listing should use main
      .mockResolvedValueOnce(
        jsonResponse({
          tree
        })
      )
      // Raw file fetches (type, record)
      .mockResolvedValueOnce(
        new Response(
          ["---", "typeId: note", "fields: {}", "---"].join("\n"),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response(["---", "typeId: note", "recordId: one", "fields: {}", "---"].join("\n"), { status: 200 }));

    const { snapshot, ignored } = await loadGitHubSnapshot({ owner: "owner", repo: "repo" });

    expect([...snapshot.files.keys()].sort()).toEqual(["records/note/record-1.md", "types/note.md"]);
    expectPartitionedImport({
      sourcePaths: tree.map((entry) => entry.path),
      includedPaths: snapshot.files.keys(),
      ignored
    });

    const treeCall = fetchMock.mock.calls.find(
      ([url]) => typeof url === "string" && url.includes("/git/trees/")
    );
    expect(treeCall?.[0]).toContain("/git/trees/main?recursive=1");

    const typeCall = fetchMock.mock.calls.find(
      ([url]) => typeof url === "string" && url.includes("/raw.githubusercontent.com/") && url.includes("/types/note.md")
    );
    expect(typeCall?.[0]).toContain("/main/types/note.md");
  });

  it("UI-PLUGIN-001: GitHub import discovers plugins/config from arbitrary paths and preserves bytes", async () => {
    const tree = [
      { path: "types/note.md", type: "blob" },
      { path: "records/note/record-1.md", type: "blob" },
      { path: "blobs/sha256/aa/aa00", type: "blob" },
      { path: "custom/ui/boolean-01/manifest.json", type: "blob" },
      { path: "custom/ui/boolean-01/plugin.js", type: "blob" },
      { path: "custom/ui/boolean-01/README.md", type: "blob" },
      { path: "cfg/graphdown.ui.json", type: "blob" },
      { path: "docs/readme.md", type: "blob" }
    ];
    const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
      const urlStr = String(url);
      if (urlStr.includes("/repos/owner/repo")) {
        if (urlStr.includes("/git/trees/")) {
          return jsonResponse({
            tree
          });
        }
        return jsonResponse({ default_branch: "main" });
      }

      const respond = (body: string | Uint8Array, init: ResponseInit = { status: 200 }) => {
        if (body instanceof Uint8Array) {
          const arrayBuffer = new ArrayBuffer(body.byteLength);
          new Uint8Array(arrayBuffer).set(body);
          return new Response(arrayBuffer, init);
        }
        return new Response(body, init);
      };

      if (urlStr.includes("/raw.githubusercontent.com/owner/repo/main/custom/ui/boolean-01/manifest.json")) {
        return respond(
          JSON.stringify({
            id: "boolean-01",
            provides: [{ capability: "field.view", match: { kind: "boolean" }, entry: "renderField" }]
          })
        );
      }
      if (urlStr.includes("/raw.githubusercontent.com/owner/repo/main/custom/ui/boolean-01/plugin.js")) {
        return respond("return { renderField() { return 'ok'; } };");
      }
      if (urlStr.includes("/raw.githubusercontent.com/owner/repo/main/custom/ui/boolean-01/README.md")) {
        return respond("# plugin docs");
      }
      if (urlStr.includes("/raw.githubusercontent.com/owner/repo/main/cfg/graphdown.ui.json")) {
        return respond(
          JSON.stringify({
            schemaVersion: 1,
            resolutions: [{ capability: "field.view", match: { kind: "boolean" }, use: "boolean-01" }]
          })
        );
      }
      if (urlStr.includes("/raw.githubusercontent.com/owner/repo/main/types/note.md")) {
        return respond(["---", "typeId: note", "fields:", "  title:", "    required: true", "---"].join("\n"));
      }
      if (urlStr.includes("/raw.githubusercontent.com/owner/repo/main/records/note/record-1.md")) {
        return respond(["---", "typeId: note", "recordId: one", "fields: {}", "---"].join("\n"));
      }
      if (urlStr.includes("/raw.githubusercontent.com/owner/repo/main/blobs/sha256/aa/aa00")) {
        return respond(new Uint8Array([1, 2, 3]));
      }
      if (urlStr.includes("/raw.githubusercontent.com/owner/repo/main/docs/readme.md")) {
        return respond("# Readme");
      }

      throw new Error(`Unexpected fetch: ${urlStr}`);
    });

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { snapshot, ignored } = await loadGitHubSnapshot({ owner: "owner", repo: "repo" });

    expect([...snapshot.files.keys()].sort()).toEqual([
      "blobs/sha256/aa/aa00",
      "cfg/graphdown.ui.json",
      "custom/ui/boolean-01/README.md",
      "custom/ui/boolean-01/manifest.json",
      "custom/ui/boolean-01/plugin.js",
      "records/note/record-1.md",
      "types/note.md"
    ]);
    expect(ignored).toEqual(["docs/readme.md"]);
    for (const path of ignored) {
      expect(snapshot.files.has(path)).toBe(false);
    }
    expectPartitionedImport({
      sourcePaths: tree.map((entry) => entry.path),
      includedPaths: snapshot.files.keys(),
      ignored
    });
  });

  it("fails fast when a plugin manifest cannot be parsed", async () => {
    const tree = [
      { path: "plugins/ok/plugin.json", type: "blob" },
      { path: "plugins/bad/plugin.json", type: "blob" },
      { path: "types/note.md", type: "blob" },
      { path: "records/note/record-1.md", type: "blob" }
    ];
    const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
      const urlStr = String(url);
      if (urlStr.includes("/repos/owner/repo")) {
        if (urlStr.includes("/git/trees/")) {
          return jsonResponse({ tree });
        }
        return jsonResponse({ default_branch: "main" });
      }

      const respond = (body: string | Uint8Array, init: ResponseInit = { status: 200 }) => {
        if (body instanceof Uint8Array) {
          const arrayBuffer = new ArrayBuffer(body.byteLength);
          new Uint8Array(arrayBuffer).set(body);
          return new Response(arrayBuffer, init);
        }
        return new Response(body, init);
      };

      if (urlStr.includes("/raw.githubusercontent.com/owner/repo/main/plugins/ok/plugin.json")) {
        return respond(JSON.stringify({ id: "ok" }));
      }
      if (urlStr.includes("/raw.githubusercontent.com/owner/repo/main/plugins/bad/plugin.json")) {
        return respond("not json");
      }
      if (urlStr.includes("/raw.githubusercontent.com/owner/repo/main/types/note.md")) {
        return respond(["---", "typeId: note", "fields:", "  title:", "    required: true", "---"].join("\n"));
      }
      if (urlStr.includes("/raw.githubusercontent.com/owner/repo/main/records/note/record-1.md")) {
        return respond(["---", "typeId: note", "recordId: one", "fields: {}", "---"].join("\n"));
      }

      throw new Error(`Unexpected fetch: ${urlStr}`);
    });

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(loadGitHubSnapshot({ owner: "owner", repo: "repo" })).rejects.toBeInstanceOf(
      PluginManifestError
    );
  });

  it("reports progress for plugin discovery and remaining downloads", async () => {
    const tree = [
      { path: "a/plugin.json", type: "blob" },
      { path: "a/plugin.js", type: "blob" },
      { path: "b/plugin.json", type: "blob" },
      { path: "types/note.md", type: "blob" },
      { path: "records/note/record-1.md", type: "blob" }
    ];
    const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
      const urlStr = String(url);
      if (urlStr.includes("/repos/owner/repo")) {
        if (urlStr.includes("/git/trees/")) {
          return jsonResponse({ tree });
        }
        return jsonResponse({ default_branch: "main" });
      }

      const respond = (body: string | Uint8Array, init: ResponseInit = { status: 200 }) => {
        if (body instanceof Uint8Array) {
          const arrayBuffer = new ArrayBuffer(body.byteLength);
          new Uint8Array(arrayBuffer).set(body);
          return new Response(arrayBuffer, init);
        }
        return new Response(body, init);
      };

      if (urlStr.includes("/raw.githubusercontent.com/owner/repo/main/a/plugin.json")) {
        return respond(
          JSON.stringify({
            id: "alpha",
            provides: [{ capability: "field.view", match: { kind: "boolean" }, entry: "renderField" }]
          })
        );
      }
      if (urlStr.includes("/raw.githubusercontent.com/owner/repo/main/b/plugin.json")) {
        return respond(JSON.stringify({ id: "beta" }));
      }
      if (urlStr.includes("/raw.githubusercontent.com/owner/repo/main/a/plugin.js")) {
        return respond("return { renderField() { return 'ok'; } };");
      }
      if (urlStr.includes("/raw.githubusercontent.com/owner/repo/main/types/note.md")) {
        return respond(["---", "typeId: note", "fields:", "  title:", "    required: true", "---"].join("\n"));
      }
      if (urlStr.includes("/raw.githubusercontent.com/owner/repo/main/records/note/record-1.md")) {
        return respond(["---", "typeId: note", "recordId: one", "fields: {}", "---"].join("\n"));
      }

      throw new Error(`Unexpected fetch: ${urlStr}`);
    });

    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const onProgress = vi.fn();

    const { snapshot, ignored } = await loadGitHubSnapshot({
      owner: "owner",
      repo: "repo",
      onProgress
    });

    const discoveryCalls = onProgress.mock.calls
      .map(([progress]) => progress)
      .filter((progress) => progress.phase === "discovering_plugins");
    expect(discoveryCalls.length).toBeGreaterThan(0);
    const discoveryTotal = discoveryCalls[0].total;
    expect(discoveryTotal).toBe(2);
    expect(discoveryCalls[discoveryCalls.length - 1].completed).toBe(discoveryTotal);
    let discoveryPrev = 0;
    for (const progress of discoveryCalls) {
      expect(progress.completed).toBeGreaterThanOrEqual(discoveryPrev);
      expect(progress.completed).toBeLessThanOrEqual(progress.total);
      discoveryPrev = progress.completed;
    }

    const downloadCalls = onProgress.mock.calls
      .map(([progress]) => progress)
      .filter((progress) => progress.phase === "downloading_files");
    expect(downloadCalls.length).toBeGreaterThan(0);
    const downloadTotal = downloadCalls[0].total;
    expect(downloadTotal).toBe(3);
    expect(downloadCalls[downloadCalls.length - 1].completed).toBe(downloadTotal);
    let downloadPrev = 0;
    for (const progress of downloadCalls) {
      expect(progress.completed).toBeGreaterThanOrEqual(downloadPrev);
      expect(progress.completed).toBeLessThanOrEqual(progress.total);
      downloadPrev = progress.completed;
    }

    expectPartitionedImport({
      sourcePaths: tree.map((entry) => entry.path),
      includedPaths: snapshot.files.keys(),
      ignored
    });
  });
});
