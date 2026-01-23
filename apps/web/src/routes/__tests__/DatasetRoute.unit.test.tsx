import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import type { RuntimeApiV1 } from "@graphmd/runtime";
import DatasetRoute from "../DatasetRoute";

const sampleSnapshot = {
  files: new Map([
    [
      "types/note.md",
      new TextEncoder().encode(
        ["---", "typeId: note", "fields:", "  name: Note", "---", "Type-level markdown lives here."].join("\n")
      )
    ]
  ])
};

const noteTypeView = {
  typeId: "note",
  fields: { name: "Note" },
  body: "Type-level markdown lives here."
};

const runtimeApiV1 = {
  apiVersion: 1,
  capabilities: ["gd.api.read"],
  listTypes: vi.fn(async () => [noteTypeView]),
  listTypeIds: vi.fn(async () => ["note"]),
  getType: vi.fn(async (typeId: string) => (typeId === "note" ? noteTypeView : null)),
  getTypeMarkdownBytes: vi.fn(async (typeId: string) =>
    typeId === "note" ? sampleSnapshot.files.get("types/note.md") ?? null : null
  ),
  listRecordKeysByType: vi.fn(async () => []),
  listRecordsByType: vi.fn(async () => []),
  getOutgoingRecordLinks: vi.fn(async () => []),
  getIncomingRecordLinks: vi.fn(async () => []),
  getTypeCompositionComponents: vi.fn(async () => []),
  listTypeCompositionEdges: vi.fn(async () => []),
  getParentRecordKey: vi.fn(async () => null),
  listChildRecordKeys: vi.fn(async () => []),
  listRootRecordKeysByType: vi.fn(async () => []),
  getRecord: vi.fn(async () => null),
  getRecordMarkdownBytes: vi.fn(async () => null),
  getBlockBytes: vi.fn(async () => null),
  hasBlock: vi.fn(async () => false),
  listBlockCidsPresent: vi.fn(async () => []),
  listBlockCidsReferencedByRecord: vi.fn(async () => []),
  listReachableBlockCids: vi.fn(async () => [])
} as unknown as RuntimeApiV1;

const activeDataset = {
  meta: {
    id: "active",
    createdAt: 0,
    updatedAt: 0,
    label: "Test dataset",
    source: "import"
  },
  snapshot: sampleSnapshot,
  runtimeApiV1,
  index: {
    typeFileById: new Map([["note", "types/note.md"]]),
    recordFileByKey: new Map()
  }
};

const datasetValue = {
  status: "ready" as const,
  progress: { phase: "done" as const },
  activeDataset,
  error: undefined,
  importDatasetZip: vi.fn(),
  importDatasetFromGitHub: vi.fn(),
  clearPersistence: vi.fn(),
  updateRecord: vi.fn(),
  createRecord: vi.fn()
};

vi.mock("../../state/DatasetContext", () => ({
  useDataset: () => datasetValue
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
    expect(vi.mocked(runtimeApiV1.listTypes).mock.calls.length).toBeLessThan(5);
  });
});
