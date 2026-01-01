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
            { path: "datasets/demo.md", type: "blob" },
            { path: "types/note.md", type: "blob" },
            { path: "records/note/record-1.md", type: "blob" }
          ]
        })
      )
      // Raw file fetches
      .mockResolvedValueOnce(new Response("---\nid: dataset:demo\n---", { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          ["---", "id: type:note", "datasetId: dataset:demo", "typeId: sys:type", "---"].join("\n"),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          ["---", "id: record:1", "datasetId: dataset:demo", "typeId: note", "---"].join("\n"),
          { status: 200 }
        )
      );

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
            { path: "datasets/demo.md", type: "blob" },
            { path: "types/note.md", type: "blob" },
            { path: "records/note/record-1.md", type: "blob" }
          ]
        })
      )
      // Raw file fetches (dataset, type, record)
      .mockResolvedValueOnce(new Response("---\nid: dataset:demo\n---", { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          ["---", "id: type:note", "datasetId: dataset:demo", "typeId: sys:type", "---"].join("\n"),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          ["---", "id: record:1", "datasetId: dataset:demo", "typeId: note", "---"].join("\n"),
          { status: 200 }
        )
      );

    const snapshot = await loadGitHubSnapshot({ owner: "owner", repo: "repo" });

    expect([...snapshot.files.keys()].sort()).toEqual([
      "datasets/demo.md",
      "records/note/record-1.md",
      "types/note.md"
    ]);

    const treeCall = fetchMock.mock.calls.find(
      ([url]) => typeof url === "string" && url.includes("/git/trees/")
    );
    expect(treeCall?.[0]).toContain("/git/trees/main?recursive=1");

    const rawCall = fetchMock.mock.calls.find(
      ([url]) => typeof url === "string" && url.includes("/raw.githubusercontent.com/")
    );
    expect(rawCall?.[0]).toContain("/main/datasets/demo.md");
  });
});
