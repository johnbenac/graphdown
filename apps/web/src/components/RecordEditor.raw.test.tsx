import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RecordEditor from "./RecordEditor";
import type { Graph, GraphNode, GraphTypeDef } from "../../../../src/core/graph";
import type { TypeSchema } from "../schema/typeSchema";
import { vi } from "vitest";

const mockUpdateRecord = vi.fn();
const mockCreateRecord = vi.fn();

vi.mock("../state/DatasetContext", () => ({
  useDataset: () => ({
    updateRecord: mockUpdateRecord,
    createRecord: mockCreateRecord
  })
}));

function makeGraph(record: GraphNode): Graph {
  return {
    nodesById: new Map([[record.id, record]]),
    typesByRecordTypeId: new Map(),
    outgoing: new Map(),
    incoming: new Map(),
    getLinksFrom: () => [],
    getLinksTo: () => [],
    getRecordTypeId: () => record.typeId,
    getTypeForRecord: () => null
  };
}

const typeDef: GraphTypeDef = {
  recordTypeId: "note",
  typeRecordId: "type:note",
  file: "types/type--note.md"
};

describe("RecordEditor raw fallback (UI-RAW-001)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUpdateRecord.mockResolvedValue({ ok: true });
    mockCreateRecord.mockResolvedValue({ ok: true, id: "new-id" });
  });

  it("UI-RAW-001: unknown schema kinds load and save raw values", async () => {
    const record: GraphNode = {
      id: "record:1",
      typeId: "note",
      createdAt: "2024-01-01",
      updatedAt: "2024-01-02",
      fields: { weird: "before" },
      body: "existing body",
      file: "records/note/record--1.md",
      kind: "record"
    };
    const schema: TypeSchema = {
      fields: [{ name: "weird", kind: "smoke-signal" }]
    };
    render(
      <RecordEditor
        mode="edit"
        record={record}
        schema={schema}
        typeDef={typeDef}
        graph={makeGraph(record)}
        onCancel={() => {}}
        onComplete={() => {}}
      />
    );

    const fieldInput = await screen.findByLabelText("weird");
    expect(fieldInput).toHaveValue("before");

    fireEvent.change(fieldInput, { target: { value: "after" } });
    fireEvent.click(screen.getByTestId("save-record"));

    await waitFor(() => expect(mockUpdateRecord).toHaveBeenCalledTimes(1));
    expect(mockUpdateRecord).toHaveBeenCalledWith({
      recordId: record.id,
      nextFields: { weird: "after" },
      nextBody: "existing body"
    });
  });

  it("UI-RAW-001: raw mode edits and saves fields outside the schema and bypasses kind semantics", async () => {
    const record: GraphNode = {
      id: "record:2",
      typeId: "note",
      createdAt: "2024-01-01",
      updatedAt: "2024-01-02",
      fields: { count: 5, extra: { nested: true } },
      body: "",
      file: "records/note/record--2.md",
      kind: "record"
    };
    const schema: TypeSchema = {
      fields: [{ name: "count", kind: "number" }]
    };

    render(
      <RecordEditor
        mode="edit"
        record={record}
        schema={schema}
        typeDef={typeDef}
        graph={makeGraph(record)}
        onCancel={() => {}}
        onComplete={() => {}}
      />
    );

    fireEvent.click(screen.getByTestId("toggle-raw-fields"));
    const rawEditor = await screen.findByTestId("raw-fields-editor");
    expect(rawEditor).toBeInTheDocument();

    const updatedRaw = JSON.stringify(
      {
        count: "not-a-number",
        extra: { nested: false },
        another: ["x", "y"]
      },
      null,
      2
    );
    fireEvent.change(rawEditor, { target: { value: updatedRaw } });
    fireEvent.click(screen.getByTestId("save-record"));

    await waitFor(() => expect(mockUpdateRecord).toHaveBeenCalledTimes(1));
    expect(mockUpdateRecord).toHaveBeenCalledWith({
      recordId: record.id,
      nextFields: { count: "not-a-number", extra: { nested: false }, another: ["x", "y"] },
      nextBody: ""
    });
  });
});
