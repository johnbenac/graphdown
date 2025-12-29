import { act, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DatasetProvider, useDataset } from "./DatasetContext";

function TestConsumer({ onReady }: { onReady?: (context: ReturnType<typeof useDataset>) => void }) {
  const context = useDataset();
  if (onReady) {
    onReady(context);
  }
  return null;
}

const datasetContent = `---\nid: \"dataset:demo\"\ndatasetId: \"dataset:demo\"\ntypeId: \"sys:dataset\"\ncreatedAt: \"2024-01-01T00:00:00Z\"\nupdatedAt: \"2024-01-01T00:00:00Z\"\nfields:\n  name: \"Demo\"\n  description: \"Demo dataset\"\n---\n`;
const typeContent = `---\nid: \"type:note\"\ndatasetId: \"dataset:demo\"\ntypeId: \"sys:type\"\ncreatedAt: \"2024-01-01T00:00:00Z\"\nupdatedAt: \"2024-01-01T00:00:00Z\"\nfields:\n  recordTypeId: \"note\"\n---\n`;
const recordContent = `---\nid: \"note:1\"\ndatasetId: \"dataset:demo\"\ntypeId: \"note\"\ncreatedAt: \"2024-01-01T00:00:00Z\"\nupdatedAt: \"2024-01-01T00:00:00Z\"\nfields:\n  title: \"Hello\"\n---\n`;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("DatasetContext GitHub import", () => {
  it("maps repo 404s to not_found", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ message: "Not Found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    let datasetContext: ReturnType<typeof useDataset> | undefined;
    render(
      <DatasetProvider>
        <TestConsumer onReady={(ctx) => (datasetContext = ctx)} />
      </DatasetProvider>
    );

    await waitFor(() => {
      expect(datasetContext?.status).toBe("ready");
    });

    await act(async () => {
      await datasetContext?.importDatasetFromGitHub("https://github.com/octocat/hello-world");
    });

    await waitFor(() => {
      expect(datasetContext?.status).toBe("error");
    });
    expect(datasetContext?.error?.category).toBe("not_found");
  });

  it("reports dataset invalid when required directories are missing", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.includes("/repos/octocat/hello-world") && !url.includes("/contents/")) {
        return new Response(JSON.stringify({ default_branch: "main" }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      return new Response(JSON.stringify({ message: "Not Found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    let datasetContext: ReturnType<typeof useDataset> | undefined;
    render(
      <DatasetProvider>
        <TestConsumer onReady={(ctx) => (datasetContext = ctx)} />
      </DatasetProvider>
    );

    await waitFor(() => {
      expect(datasetContext?.status).toBe("ready");
    });

    await act(async () => {
      await datasetContext?.importDatasetFromGitHub("https://github.com/octocat/hello-world");
    });

    await waitFor(() => {
      expect(datasetContext?.status).toBe("error");
    });
    expect(datasetContext?.error?.category).toBe("dataset_invalid");
  });

  it("imports a valid snapshot and sets the active dataset", async () => {
    const datasetUrl =
      "https://raw.githubusercontent.com/octocat/hello-world/main/datasets/dataset--demo.md";
    const typeUrl = "https://raw.githubusercontent.com/octocat/hello-world/main/types/type--note.md";
    const recordUrl =
      "https://raw.githubusercontent.com/octocat/hello-world/main/records/note/record--1.md";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.includes("/repos/octocat/hello-world") && !url.includes("/contents/")) {
        return new Response(JSON.stringify({ default_branch: "main" }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (url.includes("/contents/datasets")) {
        return new Response(
          JSON.stringify([
            {
              type: "file",
              name: "dataset--demo.md",
              path: "datasets/dataset--demo.md",
              download_url: datasetUrl
            }
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.includes("/contents/types")) {
        return new Response(
          JSON.stringify([
            {
              type: "file",
              name: "type--note.md",
              path: "types/type--note.md",
              download_url: typeUrl
            }
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.includes("/contents/records/note")) {
        return new Response(
          JSON.stringify([
            {
              type: "file",
              name: "record--1.md",
              path: "records/note/record--1.md",
              download_url: recordUrl
            }
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.includes("/contents/records")) {
        return new Response(
          JSON.stringify([
            {
              type: "dir",
              name: "note",
              path: "records/note"
            }
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url === datasetUrl) {
        return new Response(datasetContent, { status: 200 });
      }
      if (url === typeUrl) {
        return new Response(typeContent, { status: 200 });
      }
      if (url === recordUrl) {
        return new Response(recordContent, { status: 200 });
      }
      return new Response(JSON.stringify({ message: "Not Found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    let datasetContext: ReturnType<typeof useDataset> | undefined;
    render(
      <DatasetProvider>
        <TestConsumer onReady={(ctx) => (datasetContext = ctx)} />
      </DatasetProvider>
    );

    await waitFor(() => {
      expect(datasetContext?.status).toBe("ready");
    });

    await act(async () => {
      await datasetContext?.importDatasetFromGitHub("https://github.com/octocat/hello-world");
    });

    await waitFor(() => {
      expect(datasetContext?.status).not.toBe("loading");
    });
    expect(datasetContext?.error).toBeUndefined();
    expect(datasetContext?.activeDataset).toBeDefined();
    expect(datasetContext?.activeDataset?.parsedGraph).toBeDefined();
  });
});
