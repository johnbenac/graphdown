import { act, render, waitFor } from "@testing-library/react";
import { strToU8, zipSync } from "fflate";
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
    it("ERR-002: maps GitHub 404 repo responses to not_found", async () => {
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

    it("ERR-002: maps GitHub rate limits to rate_limited", async () => {
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

    it("GH-003: imports a repo snapshot via tree listing + raw fetch", async () => {
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
          JSON.stringify({
            tree: [
              { path: "datasets/demo.md", type: "blob" },
              { path: "types/note.md", type: "blob" },
              { path: "records/note/record-1.md", type: "blob" }
            ]
          }),
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

describe("DatasetContext zip import", () => {
    it("VAL-001: invalid datasets are reported as dataset_invalid", async () => {
    const zipBytes = zipSync({
      "datasets/demo.md": new Uint8Array(strToU8("---\nid: dataset:demo\n---"))
    });
    const file = {
      name: "demo.zip",
      arrayBuffer: async () => Uint8Array.from(zipBytes).buffer
    } as File;

    let ctx: ReturnType<typeof useDataset> | null = null;
    render(
      <DatasetProvider>
        <TestHarness onReady={(value) => (ctx = value)} />
      </DatasetProvider>
    );

    await act(async () => {
      await ctx?.importDatasetZip(file);
    });

    await waitFor(() => {
      expect(ctx?.status).toBe("error");
      expect(ctx?.error?.category).toBe("dataset_invalid");
      expect(ctx?.error && "errors" in ctx.error).toBe(true);
    });
  });
});
