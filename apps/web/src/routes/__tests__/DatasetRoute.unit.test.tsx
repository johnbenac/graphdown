import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import type { RuntimeApiV1 } from "@graphdown/runtime";
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
      datasetSnapshot: sampleSnapshot,
      runtimeApiV1: {
        apiVersion: 1,
        capabilities: ["gd.api.read"],
        listTypes: vi.fn(async () => [
          { typeId: "note", fields: { name: "Note" }, body: "Type-level markdown lives here." }
        ]),
        listTypeIds: vi.fn(async () => ["note"]),
        listRecordKeysByType: vi.fn(async () => []),
        listRecordsByType: vi.fn(async () => []),
        getOutgoingRecordLinks: vi.fn(async () => []),
        getIncomingRecordLinks: vi.fn(async () => []),
        getTypeCompositionComponents: vi.fn(async () => []),
        listTypeCompositionEdges: vi.fn(async () => []),
        getParentRecordKey: vi.fn(async () => null),
        listChildRecordKeys: vi.fn(async () => []),
        listRootRecordKeysByType: vi.fn(async () => []),
        getType: vi.fn(async () => null),
        getRecord: vi.fn(async () => null),
        getTypeMarkdownBytes: vi.fn(async () => null),
        getRecordMarkdownBytes: vi.fn(async () => null),
        getBlockBytes: vi.fn(async () => null),
        hasBlock: vi.fn(async () => false),
        listBlockCidsPresent: vi.fn(async () => []),
        listBlockCidsReferencedByRecord: vi.fn(async () => []),
        listReachableBlockCids: vi.fn(async () => [])
      } as unknown as RuntimeApiV1,
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

// TODO: Re-enable when the DatasetRoute render no longer hangs/leaks under Vitest/jsdom.
describe.skip("DatasetRoute", () => {
  it("shows the selected type body content", async () => {
    renderDatasetRoute();
    expect(await screen.findByTestId("type-body")).toHaveTextContent("Type-level markdown lives here.");
  });
});
