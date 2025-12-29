import { act, render, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import { DatasetProvider, useDataset } from "./DatasetContext";

function TestHarness({ onReady }: { onReady: (ctx: ReturnType<typeof useDataset>) => void }) {
  const ctx = useDataset();
  useEffect(() => {
    onReady(ctx);
  }, [ctx, onReady]);
  return null;
}

describe("DatasetContext GitHub import", () => {
  it("maps a 404 repo metadata response to not_found", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Not Found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      })
    );

    let ctx: ReturnType<typeof useDataset> | null = null;
    render(
      <DatasetProvider>
        <TestHarness onReady={(value) => (ctx = value)} />
      </DatasetProvider>
    );

    await act(async () => {
      await ctx?.importDatasetFromGitHub("https://github.com/owner/repo");
    });

    await waitFor(() => {
      expect(ctx?.status).toBe("error");
      expect(ctx?.error?.category).toBe("not_found");
    });
  });

  it("maps a rate limit response to rate_limited", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "API rate limit exceeded" }), {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          "x-ratelimit-remaining": "0"
        }
      })
    );

    let ctx: ReturnType<typeof useDataset> | null = null;
    render(
      <DatasetProvider>
        <TestHarness onReady={(value) => (ctx = value)} />
      </DatasetProvider>
    );

    await act(async () => {
      await ctx?.importDatasetFromGitHub("https://github.com/owner/repo");
    });

    await waitFor(() => {
      expect(ctx?.status).toBe("error");
      expect(ctx?.error?.category).toBe("rate_limited");
    });
  });

  it("imports a valid repo snapshot", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const datasetContent = [
      "---",
      "id: dataset:demo",
      "datasetId: dataset:demo",
      "typeId: sys:dataset",
      "createdAt: 2024-01-01",
      "updatedAt: 2024-01-02",
      "fields:",
      "  name: Demo",
      "  description: Demo dataset",
      "---"
    ].join("\n");

    const typeContent = [
      "---",
      "id: type:note",
      "datasetId: dataset:demo",
      "typeId: sys:type",
      "createdAt: 2024-01-01",
      "updatedAt: 2024-01-02",
      "fields:",
      "  recordTypeId: note",
      "---"
    ].join("\n");

    const recordContent = [
      "---",
      "id: record:1",
      "datasetId: dataset:demo",
      "typeId: note",
      "createdAt: 2024-01-01",
      "updatedAt: 2024-01-02",
      "fields: {}",
      "---"
    ].join("\n");

    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ default_branch: "main" }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              type: "file",
              path: "datasets/demo.md",
              name: "demo.md",
              download_url: "https://example.com/datasets/demo.md"
            }
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              type: "file",
              path: "types/note.md",
              name: "note.md",
              download_url: "https://example.com/types/note.md"
            }
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              type: "dir",
              path: "records/note",
              name: "note",
              download_url: null
            }
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              type: "file",
              path: "records/note/record-1.md",
              name: "record-1.md",
              download_url: "https://example.com/records/note/record-1.md"
            }
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(new Response(datasetContent, { status: 200 }))
      .mockResolvedValueOnce(new Response(typeContent, { status: 200 }))
      .mockResolvedValueOnce(new Response(recordContent, { status: 200 }));

    let ctx: ReturnType<typeof useDataset> | null = null;
    render(
      <DatasetProvider>
        <TestHarness onReady={(value) => (ctx = value)} />
      </DatasetProvider>
    );

    await act(async () => {
      await ctx?.importDatasetFromGitHub("https://github.com/owner/repo");
    });

    await waitFor(() => {
      expect(ctx?.status).toBe("ready");
      expect(ctx?.activeDataset).toBeDefined();
      expect(ctx?.activeDataset?.repoSnapshot.files.size).toBe(3);
    });
  });
});
