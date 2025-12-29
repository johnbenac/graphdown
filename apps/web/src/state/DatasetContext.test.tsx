import { useEffect } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { DatasetProvider, useDataset } from "./DatasetContext";

afterEach(() => {
  vi.restoreAllMocks();
});

function jsonResponse(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init
  });
}

function textResponse(text: string, init?: ResponseInit) {
  return new Response(text, {
    status: 200,
    ...init
  });
}

function setupFetchMock(map: Record<string, Response | (() => Response)>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const entry = map[url];
    if (entry) {
      return typeof entry === "function" ? entry() : entry;
    }
    return new Response("Not Found", { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function ImportHarness({ url }: { url: string }) {
  const { importDatasetFromGitHub, status, error, activeDataset } = useDataset();

  useEffect(() => {
    void importDatasetFromGitHub(url);
  }, [importDatasetFromGitHub, url]);

  return (
    <div>
      <div data-testid="status">{status}</div>
      <div data-testid="error">{error?.category ?? "none"}</div>
      <div data-testid="dataset">{activeDataset ? "loaded" : "empty"}</div>
    </div>
  );
}

describe("DatasetContext GitHub import", () => {
  it("categorizes repo 404 as not_found", async () => {
    setupFetchMock({
      "https://api.github.com/repos/owner/repo": () =>
        jsonResponse({ message: "Not Found" }, { status: 404 })
    });

    render(
      <DatasetProvider>
        <ImportHarness url="https://github.com/owner/repo" />
      </DatasetProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("error");
    });
    expect(screen.getByTestId("error")).toHaveTextContent("not_found");
  });

  it("imports a dataset from GitHub", async () => {
    const datasetMarkdown = `---\nid: "dataset:demo"\ndatasetId: "dataset:demo"\ntypeId: "sys:dataset"\ncreatedAt: "2024-01-01T00:00:00Z"\nupdatedAt: "2024-01-01T00:00:00Z"\nfields:\n  name: "Demo"\n  description: "Demo dataset"\n---\n`;
    const typeMarkdown = `---\nid: "type:note"\ndatasetId: "dataset:demo"\ntypeId: "sys:type"\ncreatedAt: "2024-01-01T00:00:00Z"\nupdatedAt: "2024-01-01T00:00:00Z"\nfields:\n  recordTypeId: "note"\n---\n`;
    const recordMarkdown = `---\nid: "note:1"\ndatasetId: "dataset:demo"\ntypeId: "note"\ncreatedAt: "2024-01-01T00:00:00Z"\nupdatedAt: "2024-01-01T00:00:00Z"\nfields:\n  title: "Note 1"\n---\n`;

    setupFetchMock({
      "https://api.github.com/repos/owner/repo": () => jsonResponse({ default_branch: "main" }),
      "https://api.github.com/repos/owner/repo/contents/datasets?ref=main": () =>
        jsonResponse([
          {
            type: "file",
            name: "dataset--demo.md",
            path: "datasets/dataset--demo.md",
            download_url:
              "https://raw.githubusercontent.com/owner/repo/main/datasets/dataset--demo.md",
            url: ""
          }
        ]),
      "https://api.github.com/repos/owner/repo/contents/types?ref=main": () =>
        jsonResponse([
          {
            type: "file",
            name: "type--note.md",
            path: "types/type--note.md",
            download_url:
              "https://raw.githubusercontent.com/owner/repo/main/types/type--note.md",
            url: ""
          }
        ]),
      "https://api.github.com/repos/owner/repo/contents/records?ref=main": () =>
        jsonResponse([
          {
            type: "dir",
            name: "note",
            path: "records/note",
            download_url: null,
            url: ""
          }
        ]),
      "https://api.github.com/repos/owner/repo/contents/records/note?ref=main": () =>
        jsonResponse([
          {
            type: "file",
            name: "record--1.md",
            path: "records/note/record--1.md",
            download_url:
              "https://raw.githubusercontent.com/owner/repo/main/records/note/record--1.md",
            url: ""
          }
        ]),
      "https://raw.githubusercontent.com/owner/repo/main/datasets/dataset--demo.md": () =>
        textResponse(datasetMarkdown),
      "https://raw.githubusercontent.com/owner/repo/main/types/type--note.md": () =>
        textResponse(typeMarkdown),
      "https://raw.githubusercontent.com/owner/repo/main/records/note/record--1.md": () =>
        textResponse(recordMarkdown)
    });

    render(
      <DatasetProvider>
        <ImportHarness url="https://github.com/owner/repo" />
      </DatasetProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("ready");
    });
    expect(screen.getByTestId("dataset")).toHaveTextContent("loaded");
    expect(screen.getByTestId("error")).toHaveTextContent("none");
  });
});
