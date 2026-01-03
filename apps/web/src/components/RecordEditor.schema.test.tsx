import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import RecordEditor from "./RecordEditor";
import type { GraphRecordNode, GraphTypeNode } from "../../../../src/core/graph";
import type { TypeSchema } from "../schema/typeSchema";

const mockUpdateRecord = vi.fn();
const mockCreateRecord = vi.fn();

vi.mock("../state/DatasetContext", () => ({
  useDataset: () => ({
    updateRecord: mockUpdateRecord,
    createRecord: mockCreateRecord
  })
}));

const typeDef: GraphTypeNode = {
  kind: "type",
  typeId: "note",
  fields: { name: "Note" },
  body: "",
  file: "types/type--note.md"
};

const schema: TypeSchema = {
  fields: [{ name: "title", kind: "string", required: true }]
};

describe("RecordEditor schema-aware editing (UI-SCHEMA-001)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUpdateRecord.mockResolvedValue({ ok: true });
    mockCreateRecord.mockResolvedValue({ ok: true, recordKey: "note:new-id" });
  });

  it("renders schema-backed inputs with labels", () => {
    const record: GraphRecordNode = {
      recordKey: "note:record-1",
      recordId: "record-1",
      typeId: "note",
      fields: { title: "Draft title" },
      body: "existing body",
      file: "records/note/record--1.md",
      kind: "record"
    };

    render(
      <RecordEditor
        mode="edit"
        record={record}
        schema={schema}
        typeDef={typeDef}
        onCancel={() => {}}
        onComplete={() => {}}
      />
    );

    const titleInput = screen.getByLabelText("title");
    expect(titleInput).toHaveValue("Draft title");
  });

  it("saves schema-backed fields via updateRecord", async () => {
    const record: GraphRecordNode = {
      recordKey: "note:record-2",
      recordId: "record-2",
      typeId: "note",
      fields: { title: "Draft title" },
      body: "existing body",
      file: "records/note/record--2.md",
      kind: "record"
    };

    render(
      <RecordEditor
        mode="edit"
        record={record}
        schema={schema}
        typeDef={typeDef}
        onCancel={() => {}}
        onComplete={() => {}}
      />
    );

    fireEvent.change(screen.getByLabelText("title"), { target: { value: "Updated title" } });
    fireEvent.click(screen.getByTestId("save-record"));

    await waitFor(() => expect(mockUpdateRecord).toHaveBeenCalledTimes(1));
    expect(mockUpdateRecord).toHaveBeenCalledWith({
      recordKey: record.recordKey,
      nextFields: { title: "Updated title" },
      nextBody: "existing body"
    });
  });
});
