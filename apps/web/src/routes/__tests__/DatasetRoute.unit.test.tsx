import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeAll, describe, expect, it, vi } from "vitest";

// IMPORTANT: mock BEFORE importing the module under test to cut import graph

// 1) Hard-cut the state layer to prevent pulling runtime/core/persistence
vi.mock("../../state/DatasetContext", () => ({
  useDataset: () => ({
    status: "ready",
    progress: { phase: "idle" as const },
    activeDataset: {
      meta: {
        id: "active",
        createdAt: 0,
        updatedAt: 0,
        label: "Test dataset",
        source: "import"
      },
      runtimeApiV1: {
        listTypeIds: async () => ["note"],
        listRecordKeysByType: async () => [],
        getType: async () => ({ typeId: "note", fields: {}, body: "Type-level markdown lives here." }),
        getRecord: async () => null,
        listTypes: async () => [{ typeId: "note", fields: {}, body: "Type-level markdown lives here." }],
        listRecordsByType: async () => [],
        getOutgoingRecordLinks: async () => [],
        getIncomingRecordLinks: async () => []
      }
    },
    error: undefined,
    importDatasetZip: vi.fn(),
    importDatasetFromGitHub: vi.fn(),
    clearPersistence: vi.fn(),
    updateRecord: vi.fn(),
    createRecord: vi.fn()
  }),
  DatasetProvider: ({ children }: any) => children
}));

// 2) Mock heavy child components to isolate routing logic
vi.mock("../../components/RecordEditor", () => ({ default: () => null }));
vi.mock("../../components/RecordViewer", () => ({ default: () => null }));
vi.mock("../../components/TypeNav", () => ({
  default: () => <div data-testid="type-nav" />,
  getTypeLabel: (type: any) => type?.typeId ?? ""
}));

// Make TypeViewer produce the expected test id
vi.mock("../../components/TypeViewer", () => ({
  default: ({ typeDef }: any) => (
    <div data-testid="type-body">{typeDef?.body ?? ""}</div>
  )
}));

let DatasetRoute: any;

beforeAll(async () => {
  // 3) Lazy import after mocks are installed
  DatasetRoute = (await import("../DatasetRoute")).default;
});

function renderRoute() {
  render(
    <MemoryRouter initialEntries={["/datasets/note"]}>
      <Routes>
        <Route path="/datasets/:typeId" element={<DatasetRoute />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("DatasetRoute", () => {
  it("shows the selected type body content", async () => {
    renderRoute();
    expect(await screen.findByTestId("type-body")).toHaveTextContent("Type-level markdown lives here.");
  });
});
