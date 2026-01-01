import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RecordEditor from "./RecordEditor";
import type { GraphNode, GraphTypeDef } from "../../../../src/core/graph";
import { vi } from "vitest";

const mockUpdateRecord = vi.fn();
const mockCreateRecord = vi.fn();

vi.mock("../state/DatasetContext", () => ({
  useDataset: () => ({
    updateRecord: mockUpdateRecord,
    createRecord: mockCreateRecord
  })
}));

const typeDef: GraphTypeDef = {
  recordTypeId: "note",
  typeRecordId: "type:note",
  file: "types/type--note.md"
};

describe("RecordEditor schema-agnostic editing (UI-RAW-001)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUpdateRecord.mockResolvedValue({ ok: true });
    mockCreateRecord.mockResolvedValue({ ok: true, id: "new-id" });
  });

  it("UI-RAW-001: edits arbitrary fields without kind semantics", async () => {
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
    render(
      <RecordEditor
        mode="edit"
        record={record}
        schema={undefined}
        typeDef={typeDef}
        onCancel={() => {}}
        onComplete={() => {}}
      />
    );

    const fieldsEditor = await screen.findByTestId("fields-yaml-editor");
    expect(fieldsEditor).toHaveValue("weird: before\n");

    fireEvent.change(fieldsEditor, { target: { value: "weird: after\nother: 123" } });
    fireEvent.click(screen.getByTestId("save-record"));

    await waitFor(() => expect(mockUpdateRecord).toHaveBeenCalledTimes(1));
    expect(mockUpdateRecord).toHaveBeenCalledWith({
      recordId: record.id,
      nextFields: { weird: "after", other: 123 },
      nextBody: "existing body"
    });
  });

  it("UI-RAW-001: edits fields outside any schema and persists them", async () => {
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
    render(
      <RecordEditor
        mode="edit"
        record={record}
        schema={undefined}
        typeDef={typeDef}
        onCancel={() => {}}
        onComplete={() => {}}
      />
    );

    const fieldsEditor = await screen.findByTestId("fields-yaml-editor");
    const updatedRaw = "count: not-a-number\nextra:\n  nested: false\nanother:\n  - x\n  - y\n";
    fireEvent.change(fieldsEditor, { target: { value: updatedRaw } });
    fireEvent.click(screen.getByTestId("save-record"));

    await waitFor(() => expect(mockUpdateRecord).toHaveBeenCalledTimes(1));
    expect(mockUpdateRecord).toHaveBeenCalledWith({
      recordId: record.id,
      nextFields: { count: "not-a-number", extra: { nested: false }, another: ["x", "y"] },
      nextBody: ""
    });
  });
});
