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

describe("RecordEditor schema-aware editing (UI-SCHEMA-001)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUpdateRecord.mockResolvedValue({ ok: true });
    mockCreateRecord.mockResolvedValue({ ok: true, id: "new-id" });
  });

  it("UI-SCHEMA-001: renders schema inputs with expected labels", async () => {
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
    const schema: TypeSchema = {
      fields: [{ name: "title", kind: "string", required: true }]
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

    const titleInput = await screen.findByLabelText("title");
    expect(titleInput).toHaveValue("Draft title");
  });

  it("UI-SCHEMA-001: saves edited schema fields", async () => {
    const record: GraphNode = {
      id: "record:2",
      typeId: "note",
      createdAt: "2024-01-01",
      updatedAt: "2024-01-02",
      fields: { title: "Draft title" },
      body: "existing body",
      file: "records/note/record--2.md",
      kind: "record"
    };
    const schema: TypeSchema = {
      fields: [{ name: "title", kind: "string", required: true }]
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

    const titleInput = await screen.findByLabelText("title");
    fireEvent.change(titleInput, { target: { value: "Updated title" } });
    fireEvent.click(screen.getByTestId("save-record"));

    await waitFor(() => expect(mockUpdateRecord).toHaveBeenCalledTimes(1));
    expect(mockUpdateRecord).toHaveBeenCalledWith({
      recordId: record.id,
      nextFields: { title: "Updated title" },
      nextBody: "existing body"
    });
  });

  it("UI-SCHEMA-001: normalizes ref input", async () => {
    const record: GraphNode = {
      id: "record:3",
      typeId: "note",
      createdAt: "2024-01-01",
      updatedAt: "2024-01-02",
      fields: {},
      body: "",
      file: "records/note/record--3.md",
      kind: "record"
    };
    const schema: TypeSchema = {
      fields: [{ name: "assignee", kind: "ref" }]
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

    const assigneeInput = await screen.findByLabelText("assignee");
    fireEvent.change(assigneeInput, { target: { value: "record:task-1" } });
    fireEvent.click(screen.getByTestId("save-record"));

    await waitFor(() => expect(mockUpdateRecord).toHaveBeenCalledTimes(1));
    expect(mockUpdateRecord).toHaveBeenCalledWith({
      recordId: record.id,
      nextFields: { assignee: "[[record:task-1]]" },
      nextBody: ""
    });
  });
});
