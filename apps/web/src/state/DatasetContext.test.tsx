import { act, render, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatasetProvider, useDataset } from "./DatasetContext";

type DatasetContextValue = ReturnType<typeof useDataset>;

const repoUrl = "https://api.github.com/repos/octo/demo";
const contentsBase = "https://api.github.com/repos/octo/demo/contents/";
const rawBase = "https://raw.githubusercontent.com/octo/demo/main/";

function setupHarness() {
  let latest: DatasetContextValue | undefined;
  function Harness() {
    const context = useDataset();
    useEffect(() => {
      latest = context;
    }, [context]);
    return null;
  }
  render(
    <DatasetProvider>
      <Harness />
    </DatasetProvider>
  );
  return {
    getLatest: () => {
      if (!latest) {
        throw new Error("Dataset context not ready");
      }
      return latest;
    }
  };
}

function createSuccessFetchMock() {
  const datasetFile = `---
id: "dataset:demo"
datasetId: "dataset:demo"
typeId: "sys:dataset"
createdAt: "2024-01-01T00:00:00Z"
updatedAt: "2024-01-01T00:00:00Z"
fields:
  name: "Demo Dataset"
  description: "Test dataset."
---`;
  const typeFile = `---
id: "type:note"
datasetId: "dataset:demo"
typeId: "sys:type"
createdAt: "2024-01-01T00:00:00Z"
updatedAt: "2024-01-01T00:00:00Z"
fields:
  recordTypeId: "note"
---`;
  const recordFile = `---
id: "note:1"
datasetId: "dataset:demo"
typeId: "note"
createdAt: "2024-01-01T00:00:00Z"
updatedAt: "2024-01-01T00:00:00Z"
fields:
  title: "Hello"
---`;

  const contentMap: Record<string, Array<{ type: "file" | "dir"; name: string; path: string; download_url: string | null }>> =
    {
      datasets: [
        {
          type: "file",
          name: "dataset--demo.md",
          path: "datasets/dataset--demo.md",
          download_url: `${rawBase}datasets/dataset--demo.md`
        }
      ],
      types: [
        {
          type: "file",
          name: "type--note.md",
          path: "types/type--note.md",
          download_url: `${rawBase}types/type--note.md`
        }
      ],
      records: [
        {
          type: "dir",
          name: "note",
          path: "records/note",
          download_url: null
        }
      ],
      "records/note": [
        {
          type: "file",
          name: "record--1.md",
          path: "records/note/record--1.md",
          download_url: `${rawBase}records/note/record--1.md`
        }
      ]
    };
  const rawMap: Record<string, string> = {
    "datasets/dataset--demo.md": datasetFile,
    "types/type--note.md": typeFile,
    "records/note/record--1.md": recordFile
  };

  return vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url === repoUrl) {
      return new Response(JSON.stringify({ default_branch: "main" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (url.startsWith(contentsBase)) {
      const [pathPart] = url.slice(contentsBase.length).split("?");
      const path = decodeURIComponent(pathPart);
      const listing = contentMap[path];
      if (!listing) {
        return new Response(JSON.stringify({ message: "Not Found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }
      return new Response(JSON.stringify(listing), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (url.startsWith(rawBase)) {
      const relPath = url.slice(rawBase.length);
      const body = rawMap[relPath] ?? "";
      return new Response(body, { status: 200 });
    }
    throw new Error(`Unhandled request: ${url}`);
  });
}

beforeEach(() => {
  window.history.replaceState({}, "", "/?storage=memory");
});

describe("DatasetContext GitHub import", () => {
  it("maps repo 404 to not_found", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ message: "Not Found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const harness = setupHarness();

    await act(async () => {
      await harness.getLatest().importDatasetFromGitHub("https://github.com/octo/demo");
    });

    await waitFor(() => {
      expect(harness.getLatest().status).toBe("error");
      expect(harness.getLatest().error?.category).toBe("not_found");
    });
  });

  it("maps rate limiting responses", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ message: "rate limit exceeded" }), {
        status: 403,
        headers: { "x-ratelimit-remaining": "0", "Content-Type": "application/json" }
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const harness = setupHarness();

    await act(async () => {
      await harness.getLatest().importDatasetFromGitHub("https://github.com/octo/demo");
    });

    await waitFor(() => {
      expect(harness.getLatest().status).toBe("error");
      expect(harness.getLatest().error?.category).toBe("rate_limited");
    });
  });

  it("surfaces dataset layout failures as dataset_invalid", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url === repoUrl) {
        return new Response(JSON.stringify({ default_branch: "main" }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (url.startsWith(contentsBase)) {
        const [pathPart] = url.slice(contentsBase.length).split("?");
        const path = decodeURIComponent(pathPart);
        if (path === "datasets") {
          return new Response(JSON.stringify({ message: "Not Found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const harness = setupHarness();

    await act(async () => {
      await harness.getLatest().importDatasetFromGitHub("https://github.com/octo/demo");
    });

    await waitFor(() => {
      expect(harness.getLatest().status).toBe("error");
      expect(harness.getLatest().error?.category).toBe("dataset_invalid");
    });
  });

  it("imports a valid repository", async () => {
    const fetchMock = createSuccessFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    const harness = setupHarness();

    await act(async () => {
      await harness.getLatest().importDatasetFromGitHub("https://github.com/octo/demo");
    });

    await waitFor(() => {
      expect(harness.getLatest().status).toBe("ready");
      expect(harness.getLatest().activeDataset).toBeDefined();
    });
  });
});
