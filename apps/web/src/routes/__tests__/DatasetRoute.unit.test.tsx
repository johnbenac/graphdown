import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import type { RecordLinkGraph, RecordLinkGraphTypeNode } from "@graphdown/core";
import type { RuntimeApiV1 } from "@graphdown/runtime";
import DatasetRoute from "../DatasetRoute";

const typeNode: RecordLinkGraphTypeNode = {
  kind: "type",
  typeId: "note",
  fields: { name: "Note", description: "Docs" },
  body: "Type-level markdown lives here.",
  file: "types/note.md"
};

const recordLinkGraph: RecordLinkGraph = {
  typesById: new Map([[typeNode.typeId, typeNode]]),
  recordsByKey: new Map(),
  nodesByIdentity: new Map([[typeNode.typeId, typeNode]]),
  outgoingRecordLinks: new Map(),
  incomingRecordLinks: new Map(),
  getOutgoingRecordLinks: () => [],
  getIncomingRecordLinks: () => [],
  getType: () => typeNode,
  getRecord: () => null,
  getTypeForRecord: () => typeNode,
  getTypeIdForIdentity: () => typeNode.typeId
};

const runtimeApiV1 = {
  listTypeIds: vi.fn(async () => ["note"])
} satisfies Pick<RuntimeApiV1, "listTypeIds">;

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
      datasetSnapshot: { files: new Map([["types/note.md", new Uint8Array()]]) },
      recordLinkGraph,
      runtimeApiV1: runtimeApiV1 as RuntimeApiV1
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
  it("shows the selected type body content", () => {
    renderDatasetRoute();
    expect(screen.getByTestId("type-body")).toHaveTextContent("Type-level markdown lives here.");
  });
});
