import "fake-indexeddb/auto";
import { act, render, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildDatasetZipBytes } from "@graphdown/io-zip";
import { DatasetProvider, useDataset } from "../DatasetContext";
import type { DatasetContextValue } from "../DatasetContext";

const enc = new TextEncoder();
const toBytes = (text: string) => enc.encode(text);

function TestHarness({ onReady }: { onReady: (ctx: DatasetContextValue) => void }) {
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

    let ctx: DatasetContextValue | null = null;
    render(
      <DatasetProvider>
        <TestHarness onReady={(value) => (ctx = value)} />
      </DatasetProvider>
    );

    await waitFor(() => expect(ctx).not.toBeNull());
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

    let ctx: DatasetContextValue | null = null;
    render(
      <DatasetProvider>
        <TestHarness onReady={(value) => (ctx = value)} />
      </DatasetProvider>
    );

    await waitFor(() => expect(ctx).not.toBeNull());
    await act(async () => {
      await ctx?.importDatasetFromGitHub("https://github.com/owner/repo");
    });

    await waitFor(() => {
      expect(ctx?.status).toBe("error");
      expect(ctx?.error?.category).toBe("rate_limited");
    });
  });

  it("GH-003: imports a dataset snapshot via tree listing + raw fetch", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);

      if (url.origin === "https://api.github.com" && url.pathname === "/repos/owner/repo") {
        return new Response(JSON.stringify({ default_branch: "main" }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      if (url.origin === "https://api.github.com" && url.pathname === "/repos/owner/repo/git/trees/main") {
        expect(url.searchParams.get("recursive")).toBe("1");
        return new Response(
          JSON.stringify({
            tree: [
              { path: "types/note.md", type: "blob" },
              { path: "records/note/record-1.md", type: "blob" }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.origin === "https://raw.githubusercontent.com") {
        if (url.pathname.endsWith("/types/note.md")) {
          return new Response(
            [
              "---",
              "typeId: note",
              "fields:",
              "  fieldDefs:",
              "    title:",
              "      required: false",
              "---"
            ].join("\n"),
            { status: 200 }
          );
        }
        if (url.pathname.endsWith("/records/note/record-1.md")) {
          return new Response(
            [
              "---",
              "typeId: note",
              "recordId: record-1",
              "fields:",
              "  title: Hello",
              "---",
              "Body"
            ].join("\n"),
            { status: 200 }
          );
        }
      }

      throw new Error(`Unexpected fetch: ${url.toString()}`);
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    let ctx: DatasetContextValue | null = null;
    render(
      <DatasetProvider>
        <TestHarness onReady={(value) => (ctx = value)} />
      </DatasetProvider>
    );

    await waitFor(() => expect(ctx).not.toBeNull());
    await act(async () => {
      await ctx?.importDatasetFromGitHub("https://github.com/owner/repo");
    });

    await waitFor(() => {
      expect(ctx?.status).toBe("ready");
      expect(ctx?.activeDataset).toBeDefined();
      expect(ctx?.activeDataset?.snapshot.files.size).toBe(2);
    });
    const runtimeApiV1 = (ctx as DatasetContextValue | null)?.activeDataset?.runtimeApiV1;
    expect(runtimeApiV1).toBeDefined();
    await expect(runtimeApiV1?.listTypeIds()).resolves.toEqual(["note"]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls.some(([url]) => String(url).startsWith("https://raw.githubusercontent.com/"))).toBe(
      true
    );
  });
});

describe("DatasetContext zip import", () => {
  it("VAL-001: invalid datasets are reported as dataset_invalid", async () => {
    const zipBytes = buildDatasetZipBytes({
      files: new Map([["records/note.one/one.md", toBytes("---\ntypeId: note\nrecordId: one\nfields: {}\n---\nBody")]])
    });
    const file = {
      name: "demo.zip",
      arrayBuffer: async () =>
        zipBytes.buffer.slice(zipBytes.byteOffset, zipBytes.byteOffset + zipBytes.byteLength)
    } as File;

    let ctx: DatasetContextValue | null = null;
    render(
      <DatasetProvider>
        <TestHarness onReady={(value) => (ctx = value)} />
      </DatasetProvider>
    );

    await waitFor(() => expect(ctx).not.toBeNull());
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

describe("DatasetContext persistence requirements", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("NFR-PERSIST-001: reports persistence_unavailable when IndexedDB is missing", async () => {
    vi.stubGlobal("indexedDB", undefined);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    let ctx: DatasetContextValue | null = null;
    render(
      <DatasetProvider>
        <TestHarness onReady={(value) => (ctx = value)} />
      </DatasetProvider>
    );

    await waitFor(() => expect(ctx).not.toBeNull());
    await waitFor(() => {
      expect(ctx?.status).toBe("error");
      expect(ctx?.error?.category).toBe("persistence_unavailable");
    });
    expect(errorSpy).toHaveBeenCalled();
  });
});
