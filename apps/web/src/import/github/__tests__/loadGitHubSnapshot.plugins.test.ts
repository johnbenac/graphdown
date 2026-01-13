import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadGitHubSnapshot } from "../loadGitHubSnapshot";

const jsonResponse = (data: unknown) =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });

function resolveFixturePath(url: URL): string {
  if (url.protocol === "file:") {
    return fileURLToPath(url);
  }
  const sanitizedPath = url.pathname.startsWith("/@fs/")
    ? url.pathname.replace("/@fs/", "/")
    : url.pathname;
  return fileURLToPath(new URL(sanitizedPath, pathToFileURL(`${process.cwd()}/`)));
}

describe("loadGitHubSnapshot plugin support", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("IMP-PLUG-001: fetches plugin bundles (including non-md) and includes them in snapshot.files", async () => {
    const fixtureManifestUrl = new URL(
      "../../../../../../packages/core/src/__fixtures__/plugin-valid-dataset/extensions/demo/plugin.md",
      import.meta.url
    );
    const fixtureManifestPath = resolveFixturePath(fixtureManifestUrl);
    const fixtureManifest = readFileSync(fixtureManifestPath, "utf8");

    const fetchMock = vi.fn(async (url) => {
      const urlString = typeof url === "string" ? url : url.toString();
      if (urlString === "https://api.github.com/repos/owner/repo") {
        return jsonResponse({ default_branch: "main" });
      }
      if (urlString.includes("/git/trees/")) {
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
      if (urlString.startsWith("https://raw.githubusercontent.com/owner/repo/main/")) {
        const path = urlString.replace("https://raw.githubusercontent.com/owner/repo/main/", "");
        if (path === "types/note.md") {
          return new Response(
            ["---", "typeId: note", "fields: {}", "---"].join("\n"),
            { status: 200 }
          );
        }
        if (path === "records/note/record-1.md") {
          return new Response(
            ["---", "typeId: note", "recordId: one", "fields: {}", "---"].join("\n"),
            { status: 200 }
          );
        }
        if (path === "extensions/demo/plugin.md") {
          return new Response(fixtureManifest, { status: 200 });
        }
        if (path === "extensions/demo/ui.md") {
          return new Response("# plugin ui", { status: 200 });
        }
        if (path === "extensions/demo/entry.js") {
          return new Response("console.log('plugin');", { status: 200 });
        }
        if (path === "docs/readme.md") {
          return new Response("# readme", { status: 200 });
        }
        if (path === "assets/logo.png") {
          return new Response(new Uint8Array([0, 1, 2]), { status: 200 });
        }
      }
      return new Response("Not found", { status: 404 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { snapshot, ignored } = await loadGitHubSnapshot({ owner: "owner", repo: "repo" });

    expect(snapshot.files.has("extensions/demo/plugin.md")).toBe(true);
    expect(snapshot.files.has("extensions/demo/ui.md")).toBe(true);
    expect(snapshot.files.has("extensions/demo/entry.js")).toBe(true);
    expect(ignored).toEqual(expect.arrayContaining(["docs/readme.md", "assets/logo.png"]));

    const uiMdFetches = fetchMock.mock.calls.filter(
      ([callUrl]) => typeof callUrl === "string" && callUrl.includes("/extensions/demo/ui.md")
    );
    expect(uiMdFetches).toHaveLength(1);
    const entryJsFetches = fetchMock.mock.calls.filter(
      ([callUrl]) => typeof callUrl === "string" && callUrl.includes("/extensions/demo/entry.js")
    );
    expect(entryJsFetches.length).toBeGreaterThan(0);
  });
});
