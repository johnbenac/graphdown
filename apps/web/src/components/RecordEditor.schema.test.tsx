import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import type { GraphNode, GraphTypeDef } from "../../../../src/core/graph";
import type { TypeSchema } from "../schema/typeSchema";
import RecordEditor from "./RecordEditor";

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

const schema: TypeSchema = {
  fields: [{ name: "title", kind: "string", required: true }]
};

describe("RecordEditor schema-aware editing (UI-SCHEMA-001)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUpdateRecord.mockResolvedValue({ ok: true });
    mockCreateRecord.mockResolvedValue({ ok: true, id: "new-id" });
  });

  it("UI-SCHEMA-001: renders schema fields with labels", () => {
    const record: GraphNode = {
      id: "record:1",
      typeId: "note",
      createdAt: "2024-01-01",
      updatedAt: "2024-01-02",
      fields: { title: "Draft title" },
      body: "",
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

  it("UI-SCHEMA-001: saves schema edits through updateRecord", async () => {
    const record: GraphNode = {
      id: "record:2",
      typeId: "note",
      createdAt: "2024-01-01",
      updatedAt: "2024-01-02",
      fields: { title: "Old title" },
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
      recordId: record.id,
      nextFields: { title: "Updated title" },
      nextBody: "existing body"
    });
  });
});
