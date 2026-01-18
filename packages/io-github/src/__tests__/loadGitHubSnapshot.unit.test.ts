import { describe, expect, it, vi } from "vitest";
import { loadGitHubSnapshot } from "../loadGitHubSnapshot";

const jsonResponse = (data: unknown) =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });

describe("loadGitHubSnapshot", () => {
  it("GH-008: does not send Authorization headers for public fetches", async () => {
    const fetchMock = vi.fn();

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
          ["---", "id: type:note", "typeId: sys:type", "fields:", "  typeId: note", "---"].join("\n"),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(["---", "id: record:1", "typeId: note", "---"].join("\n"), { status: 200 })
      );

    await loadGitHubSnapshot({ owner: "owner", repo: "repo", fetch: fetchMock });

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
          ["---", "id: type:note", "typeId: sys:type", "fields:", "  typeId: note", "---"].join("\n"),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(["---", "id: record:1", "typeId: note", "---"].join("\n"), { status: 200 })
      );

    const { snapshot } = await loadGitHubSnapshot({ owner: "owner", repo: "repo", fetch: fetchMock });

    expect([...snapshot.files.keys()].sort()).toEqual(["records/note/record-1.md", "types/note.md"]);

    const treeCall = fetchMock.mock.calls.find(
      ([url]) => typeof url === "string" && url.includes("/git/trees/")
    );
    expect(treeCall?.[0]).toContain("/git/trees/main?recursive=1");

    const rawCall = fetchMock.mock.calls.find(
      ([url]) => typeof url === "string" && url.includes("/raw.githubusercontent.com/")
    );
    expect(rawCall?.[0]).toContain("/main/types/note.md");
  });

  it("includes blocks under blocks and reports ignored files", async () => {
    const fetchMock = vi.fn();

    fetchMock
      .mockResolvedValueOnce(jsonResponse({ default_branch: "main" }))
      .mockResolvedValueOnce(
        jsonResponse({
          tree: [
            { path: "types/note.md", type: "blob" },
            { path: "records/note/record-1.md", type: "blob" },
            { path: "blocks/sha2-256/aa/aa00", type: "blob" },
            { path: "docs/readme.md", type: "blob" }
          ]
        })
      )
      // type
      .mockResolvedValueOnce(
        new Response(
          ["---", "typeId: note", "fields:", "  title:", "    required: true", "---"].join("\n"),
          { status: 200 }
        )
      )
      // record
      .mockResolvedValueOnce(
        new Response(["---", "typeId: note", "recordId: one", "fields: {}", "---"].join("\n"), { status: 200 })
      )
      // block
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), { status: 200 }))
      // docs/readme.md (downloaded, then ignored)
      .mockResolvedValueOnce(new Response("# readme", { status: 200 }));

    const { snapshot, ignored } = await loadGitHubSnapshot({ owner: "owner", repo: "repo", fetch: fetchMock });

    expect([...snapshot.files.keys()].sort()).toEqual(
      [
        "blocks/sha2-256/aa/aa00",
        "records/note/record-1.md",
        "types/note.md"
      ].sort()
    );
    expect(ignored.sort()).toEqual(["docs/readme.md"].sort());
  });

  it("imports Graphdown markdown in non-canonical paths", async () => {
    const fetchMock = vi.fn();

    fetchMock
      .mockResolvedValueOnce(jsonResponse({ default_branch: "main" }))
      .mockResolvedValueOnce(
        jsonResponse({
          tree: [
            { path: "weird/type.md", type: "blob" },
            { path: "somewhere/record.md", type: "blob" },
            { path: "docs/readme.md", type: "blob" },
            { path: "assets/logo.png", type: "blob" }
          ]
        })
      )
      // type
      .mockResolvedValueOnce(
        new Response(
          ["---", "typeId: note", "fields:", "  title:", "    required: true", "---"].join("\n"),
          { status: 200 }
        )
      )
      // record
      .mockResolvedValueOnce(
        new Response(["---", "typeId: note", "recordId: one", "fields: {}", "---"].join("\n"), { status: 200 })
      )
      // docs/readme.md
      .mockResolvedValueOnce(new Response("# readme", { status: 200 }));

    const { snapshot, ignored } = await loadGitHubSnapshot({ owner: "owner", repo: "repo", fetch: fetchMock });

    expect([...snapshot.files.keys()].sort()).toEqual(["somewhere/record.md", "weird/type.md"].sort());
    expect(ignored.sort()).toEqual(["assets/logo.png", "docs/readme.md"].sort());
  });
});
