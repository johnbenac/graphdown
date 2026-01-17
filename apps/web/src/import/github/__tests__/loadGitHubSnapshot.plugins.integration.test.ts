import { afterEach, describe, expect, it, vi } from "vitest";
import { loadGitHubSnapshot } from "../loadGitHubSnapshot";

const jsonResponse = (data: unknown) =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });

describe("loadGitHubSnapshot plugin bundles", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it("IMP-PLUG-001: fetches plugin bundles (including non-md) and includes them in snapshot.files", async () => {
    const manifestText = [
      "---",
      "pluginId: demo",
      "gdApiVersion: 1",
      "entry: entry.js",
      "files:",
      "  - entry.js",
      "  - ui.md",
      "  - assets/logo.bin",
      "binaryFiles:",
      "  - assets/logo.bin",
      "---"
    ].join("\n");

    const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
      const urlString = url.toString();
      if (urlString === "https://api.github.com/repos/owner/repo") {
        return jsonResponse({ default_branch: "main" });
      }
      if (urlString === "https://api.github.com/repos/owner/repo/git/trees/main?recursive=1") {
        return jsonResponse({
          tree: [
            { path: "types/note.md", type: "blob" },
            { path: "records/note/record-1.md", type: "blob" },
            { path: "extensions/demo/plugin.md", type: "blob" },
            { path: "extensions/demo/ui.md", type: "blob" },
            { path: "extensions/demo/entry.js", type: "blob" },
            { path: "extensions/demo/assets/logo.bin", type: "blob" },
            { path: "docs/readme.md", type: "blob" },
            { path: "assets/logo.png", type: "blob" }
          ]
        });
      }

      if (urlString.startsWith("https://raw.githubusercontent.com/owner/repo/main/")) {
        const path = urlString.replace("https://raw.githubusercontent.com/owner/repo/main/", "");
        if (path === "types/note.md") {
          return new Response(
            ["---", "typeId: note", "fields:", "  title:", "    required: true", "---"].join("\n"),
            { status: 200 }
          );
        }
        if (path === "records/note/record-1.md") {
          return new Response(["---", "typeId: note", "recordId: one", "fields: {}", "---"].join("\n"), {
            status: 200
          });
        }
        if (path === "extensions/demo/plugin.md") {
          return new Response(manifestText, { status: 200 });
        }
        if (path === "extensions/demo/ui.md") {
          return new Response("# demo ui", { status: 200 });
        }
        if (path === "extensions/demo/entry.js") {
          return new Response("console.log('demo');", { status: 200 });
        }
        if (path === "extensions/demo/assets/logo.bin") {
          return new Response(new Uint8Array([0, 1, 255, 2]), { status: 200 });
        }
        if (path === "docs/readme.md") {
          return new Response("# readme", { status: 200 });
        }
      }

      return new Response("Not found", { status: 404 });
    });

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { snapshot, ignored } = await loadGitHubSnapshot({ owner: "owner", repo: "repo" });

    expect(snapshot.files.has("extensions/demo/plugin.md")).toBe(true);
    expect(snapshot.files.has("extensions/demo/ui.md")).toBe(true);
    expect(snapshot.files.has("extensions/demo/entry.js")).toBe(true);
    expect(snapshot.files.has("extensions/demo/assets/logo.bin")).toBe(true);
    expect(ignored).toEqual(expect.arrayContaining(["docs/readme.md", "assets/logo.png"]));

    const uiFetches = fetchMock.mock.calls.filter(
      ([url]) => url.toString().includes("/extensions/demo/ui.md")
    );
    expect(uiFetches).toHaveLength(1);

    const entryFetches = fetchMock.mock.calls.filter(
      ([url]) => url.toString().includes("/extensions/demo/entry.js")
    );
    expect(entryFetches.length).toBeGreaterThan(0);
  });
});
