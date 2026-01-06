import { describe, expect, it, vi, afterEach } from "vitest";
import { loadGitHubSnapshot } from "./loadGitHubSnapshot";

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
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    fetchMock
      // Repo metadata
      .mockResolvedValueOnce(jsonResponse({ default_branch: "main" }))
      // Tree listing
      .mockResolvedValueOnce(
        jsonResponse({
          tree: [
            { path: "types/note.md", type: "blob" },
            { path: "records/note/record-1.md", type: "blob" }
          ]
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

    await loadGitHubSnapshot({ owner: "owner", repo: "repo" });

    // All fetch calls should omit Authorization headers
    for (const [, options] of fetchMock.mock.calls) {
      const headers =
        (options as RequestInit | undefined)?.headers &&
        new Headers((options as RequestInit).headers as HeadersInit);
      expect(headers?.has("authorization")).not.toBe(true);
    }
  });

  it("GH-002: falls back to main when default_branch is missing", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    fetchMock
      // Repo metadata (no default_branch)
      .mockResolvedValueOnce(jsonResponse({}))
      // Tree listing should use main
      .mockResolvedValueOnce(
        jsonResponse({
          tree: [
            { path: "types/note.md", type: "blob" },
            { path: "records/note/record-1.md", type: "blob" }
          ]
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

    const { snapshot } = await loadGitHubSnapshot({ owner: "owner", repo: "repo" });

    expect([...snapshot.files.keys()].sort()).toEqual(["records/note/record-1.md", "types/note.md"]);

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
    const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
      const urlStr = String(url);
      if (urlStr.includes("/repos/owner/repo")) {
        if (urlStr.includes("/git/trees/")) {
          return jsonResponse({
            tree: [
              { path: "types/note.md", type: "blob" },
              { path: "records/note/record-1.md", type: "blob" },
              { path: "blobs/sha256/aa/aa00", type: "blob" },
              { path: "custom/ui/boolean-01/plugin.json", type: "blob" },
              { path: "custom/ui/boolean-01/plugin.js", type: "blob" },
              { path: "custom/ui/boolean-01/README.md", type: "blob" },
              { path: "cfg/graphdown.ui.json", type: "blob" },
              { path: "docs/readme.md", type: "blob" }
            ]
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

      if (urlStr.includes("/raw.githubusercontent.com/owner/repo/main/custom/ui/boolean-01/plugin.json")) {
        return respond(
          JSON.stringify({
            schemaVersion: 1,
            id: "boolean-01",
            version: "1.0.0",
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
      "custom/ui/boolean-01/plugin.js",
      "custom/ui/boolean-01/plugin.json",
      "records/note/record-1.md",
      "types/note.md"
    ]);
    expect(ignored).toEqual(["docs/readme.md"]);
    for (const path of ignored) {
      expect(snapshot.files.has(path)).toBe(false);
    }
  });

  it("import ignored paths: does not report included plugin artifacts/config as ignored", async () => {
    const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
      const urlStr = String(url);
      if (urlStr.includes("/repos/owner/repo")) {
        if (urlStr.includes("/git/trees/")) {
          return jsonResponse({
            tree: [
              { path: "custom/ui/boolean-01/plugin.json", type: "blob" },
              { path: "custom/ui/boolean-01/plugin.js", type: "blob" },
              { path: "custom/ui/boolean-01/README.md", type: "blob" },
              { path: "custom/ui/boolean-01/graphdown.ui.json", type: "blob" },
              { path: "custom/ui/boolean-01/00/plugin.json", type: "blob" },
              { path: "cfg/graphdown.ui.json", type: "blob" },
              { path: "zzz/graphdown.ui.json", type: "blob" },
              { path: "assets/logo.png", type: "blob" },
              { path: "docs/readme.md", type: "blob" },
              { path: "types/note.md", type: "blob" },
              { path: "records/note/record-1.md", type: "blob" },
              { path: "other/plugin.json", type: "blob" }
            ]
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

      if (urlStr.includes("/raw.githubusercontent.com/owner/repo/main/custom/ui/boolean-01/plugin.json")) {
        return respond(
          JSON.stringify({
            schemaVersion: 1,
            id: "boolean-01",
            version: "1.0.0",
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
      if (urlStr.includes("/raw.githubusercontent.com/owner/repo/main/custom/ui/boolean-01/graphdown.ui.json")) {
        return respond(
          JSON.stringify({
            schemaVersion: 1,
            resolutions: [{ capability: "field.view", match: { kind: "boolean" }, use: "boolean-01" }]
          })
        );
      }
      if (urlStr.includes("/raw.githubusercontent.com/owner/repo/main/cfg/graphdown.ui.json")) {
        return respond(
          JSON.stringify({
            schemaVersion: 1,
            resolutions: [{ capability: "field.view", match: { kind: "boolean" }, use: "boolean-01" }]
          })
        );
      }
      if (urlStr.includes("/raw.githubusercontent.com/owner/repo/main/zzz/graphdown.ui.json")) {
        return respond(
          JSON.stringify({
            schemaVersion: 1,
            resolutions: [{ capability: "field.view", match: { kind: "boolean" }, use: "boolean-01" }]
          })
        );
      }
      if (urlStr.includes("/raw.githubusercontent.com/owner/repo/main/custom/ui/boolean-01/00/plugin.json")) {
        return respond("{ invalid json");
      }
      if (urlStr.includes("/raw.githubusercontent.com/owner/repo/main/types/note.md")) {
        return respond(["---", "typeId: note", "fields:", "  title:", "    required: true", "---"].join("\n"));
      }
      if (urlStr.includes("/raw.githubusercontent.com/owner/repo/main/records/note/record-1.md")) {
        return respond(["---", "typeId: note", "recordId: one", "fields: {}", "---"].join("\n"));
      }
      if (urlStr.includes("/raw.githubusercontent.com/owner/repo/main/docs/readme.md")) {
        return respond("# Readme");
      }
      if (urlStr.includes("/raw.githubusercontent.com/owner/repo/main/other/plugin.json")) {
        return respond("not a manifest");
      }

      throw new Error(`Unexpected fetch: ${urlStr}`);
    });

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { snapshot, ignored } = await loadGitHubSnapshot({ owner: "owner", repo: "repo" });

    expect(snapshot.files.has("custom/ui/boolean-01/plugin.json")).toBe(true);
    expect(snapshot.files.has("custom/ui/boolean-01/plugin.js")).toBe(true);
    expect(snapshot.files.has("custom/ui/boolean-01/README.md")).toBe(true);
    expect(snapshot.files.has("custom/ui/boolean-01/graphdown.ui.json")).toBe(true);
    expect(snapshot.files.has("custom/ui/boolean-01/00/plugin.json")).toBe(true);
    expect(snapshot.files.has("cfg/graphdown.ui.json")).toBe(true);
    expect(snapshot.files.has("zzz/graphdown.ui.json")).toBe(false);
    expect(snapshot.files.has("assets/logo.png")).toBe(false);
    expect(snapshot.files.has("docs/readme.md")).toBe(false);
    expect(snapshot.files.has("other/plugin.json")).toBe(false);

    expect(ignored).toEqual(["assets/logo.png", "docs/readme.md", "other/plugin.json", "zzz/graphdown.ui.json"]);
    expect(new Set(ignored).size).toBe(ignored.length);
    expect(ignored).toEqual([...ignored].sort((a, b) => a.localeCompare(b)));
    for (const path of ignored) {
      expect(snapshot.files.has(path)).toBe(false);
    }
  });
});
