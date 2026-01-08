import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import type { Graph, GraphTypeNode } from "../../core/graph";
import DatasetRoute from "../DatasetRoute";

const typeNode: GraphTypeNode = {
  kind: "type",
  typeId: "note",
  fields: { name: "Note", description: "Docs" },
  body: "Type-level markdown lives here.",
  file: "types/note.md"
};

const graph: Graph = {
  typesById: new Map([[typeNode.typeId, typeNode]]),
  recordsByKey: new Map(),
  nodesById: new Map([[typeNode.typeId, typeNode]]),
  typesByRecordTypeId: new Map([[typeNode.typeId, typeNode]]),
  outgoing: new Map(),
  incoming: new Map(),
  getLinksFrom: () => [],
  getLinksTo: () => [],
  getType: () => typeNode,
  getRecord: () => null,
  getTypeForRecord: () => typeNode,
  getRecordTypeId: () => typeNode.typeId
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
        snapshotFormatVersion: 1,
        graphFormatVersion: 1,
        uiStateFormatVersion: 1,
        label: "Test dataset",
        source: "import"
      },
      datasetSnapshot: { files: new Map([["types/note.md", new Uint8Array()]]) },
      parsedGraph: graph
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
        <Route path="/datasets/:recordTypeId" element={<DatasetRoute />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("DatasetRoute", () => {
  it("shows the selected type body content", () => {
    renderDatasetRoute();
    expect(screen.getByTestId("type-body")).toHaveTextContent("Type-level markdown lives here.");
  });
});
