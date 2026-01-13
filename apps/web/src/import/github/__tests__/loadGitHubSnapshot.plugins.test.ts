import { afterEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
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
    const fixturePath = path.resolve(
      process.cwd(),
      "../../packages/core/src/__fixtures__/plugin-valid-dataset/extensions/demo/plugin.md"
    );
    const manifestBytes = await readFile(fixturePath);

    const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
      const urlString = typeof url === "string" ? url : url.toString();
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
            { path: "docs/readme.md", type: "blob" },
            { path: "assets/logo.png", type: "blob" }
          ]
        });
      }
      if (urlString.startsWith("https://raw.githubusercontent.com/owner/repo/main/")) {
        const path = urlString.replace("https://raw.githubusercontent.com/owner/repo/main/", "");
        switch (path) {
          case "types/note.md":
            return new Response(
              ["---", "typeId: note", "fields:", "  title:", "    required: true", "---"].join("\n"),
              { status: 200 }
            );
          case "records/note/record-1.md":
            return new Response(["---", "typeId: note", "recordId: one", "fields: {}", "---"].join("\n"), {
              status: 200
            });
          case "extensions/demo/plugin.md":
            return new Response(new Uint8Array(manifestBytes), { status: 200 });
          case "extensions/demo/ui.md":
            return new Response("# ui", { status: 200 });
          case "extensions/demo/entry.js":
            return new Response("console.log('demo');", { status: 200 });
          case "docs/readme.md":
            return new Response("# readme", { status: 200 });
          default:
            return new Response(null, { status: 404 });
        }
      }
      return new Response(null, { status: 404 });
    });

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { snapshot, ignored } = await loadGitHubSnapshot({ owner: "owner", repo: "repo" });

    expect(snapshot.files.has("extensions/demo/plugin.md")).toBe(true);
    expect(snapshot.files.has("extensions/demo/ui.md")).toBe(true);
    expect(snapshot.files.has("extensions/demo/entry.js")).toBe(true);
    expect(ignored).toContain("docs/readme.md");
    expect(ignored).toContain("assets/logo.png");

    const rawCalls = fetchMock.mock.calls.filter(
      ([callUrl]) => typeof callUrl === "string" && callUrl.includes("raw.githubusercontent.com")
    );
    const uiCalls = rawCalls.filter(([callUrl]) =>
      (callUrl as string).includes("/extensions/demo/ui.md")
    );
    const entryCalls = rawCalls.filter(([callUrl]) =>
      (callUrl as string).includes("/extensions/demo/entry.js")
    );
    expect(uiCalls).toHaveLength(1);
    expect(entryCalls.length).toBeGreaterThan(0);
  });
});
