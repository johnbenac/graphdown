import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import DatasetRoute from "../DatasetRoute";
import { createRuntimeApiV1Mock } from "../../testUtils/runtimeApiV1Mock";

const encoder = new TextEncoder();

const typeMarkdown = [
  "---",
  "typeId: note",
  "fields:",
  "  name: Note",
  "  description: Docs",
  "---",
  "Type-level markdown lives here."
].join("\n");

const datasetSnapshot = {
  files: new Map([["types/note.md", encoder.encode(typeMarkdown)]])
};

vi.mock("../../state/DatasetContext", () => ({
  useDataset: () => ({
    status: "ready",
    progress: { phase: "done" as const },
    activeDataset: {
      meta: {
        id: "active",
        createdAt: 0,
        updatedAt: 0,
        label: "Test dataset",
        source: "import"
      },
      datasetSnapshot,
      runtimeApiV1: createRuntimeApiV1Mock(datasetSnapshot),
      index: {
        typeFileById: new Map([["note", "types/note.md"]]),
        recordFileByKey: new Map()
      }
    },
    error: undefined,
    importDatasetZip: vi.fn(),
    importDatasetFromGitHub: vi.fn(),
    clearPersistence: vi.fn(),
    updateRecord: vi.fn(),
    createRecord: vi.fn()
  })
}));

function renderDatasetRoute(path = "/datasets/note") {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/datasets" element={<DatasetRoute />} />
        <Route path="/datasets/:typeId" element={<DatasetRoute />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("DatasetRoute", () => {
  it("shows the selected type body content", async () => {
    renderDatasetRoute();
    expect(await screen.findByTestId("type-body")).toHaveTextContent("Type-level markdown lives here.");
  });
});
