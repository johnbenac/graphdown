import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import RecordEditor from "./RecordEditor";
import type { GraphNode, GraphTypeDef } from "../../../../src/core/graph";
import type { TypeSchema } from "../schema/typeSchema";

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
  fields: [
    { name: "title", kind: "string", required: true },
    { name: "assignee", kind: "ref" }
  ]
};

describe("RecordEditor schema-aware editing (UI-SCHEMA-001)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUpdateRecord.mockResolvedValue({ ok: true });
    mockCreateRecord.mockResolvedValue({ ok: true, id: "new-id" });
  });

  it("UI-SCHEMA-001: renders schema inputs with correct labels", () => {
    const record: GraphNode = {
      id: "record:1",
      typeId: "note",
      createdAt: "2024-01-01",
      updatedAt: "2024-01-02",
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

    expect(screen.getByLabelText("title")).toHaveValue("Draft title");
    expect(screen.getByLabelText("assignee")).toHaveValue("");
  });

  it("UI-SCHEMA-001: saves updates to schema fields", async () => {
    const record: GraphNode = {
      id: "record:2",
      typeId: "note",
      createdAt: "2024-01-01",
      updatedAt: "2024-01-02",
      fields: { title: "Draft title" },
      body: "",
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
    fireEvent.change(screen.getByLabelText("assignee"), { target: { value: "record:task-1" } });
    fireEvent.click(screen.getByTestId("save-record"));

    await waitFor(() => expect(mockUpdateRecord).toHaveBeenCalledTimes(1));
    expect(mockUpdateRecord).toHaveBeenCalledWith({
      recordId: record.id,
      nextFields: { title: "Updated title", assignee: "[[record:task-1]]" },
      nextBody: ""
    });
  });
});
