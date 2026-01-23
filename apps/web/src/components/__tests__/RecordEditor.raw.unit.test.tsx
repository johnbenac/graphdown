import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RecordEditor from "../RecordEditor";
import type { RuntimeRecordViewV1, RuntimeTypeViewV1 } from "@graphmd/runtime";
import { vi } from "vitest";

const mockUpdateRecord = vi.fn();
const mockCreateRecord = vi.fn();

vi.mock("../../state/DatasetContext", () => ({
  useDataset: () => ({
    updateRecord: mockUpdateRecord,
    createRecord: mockCreateRecord
  })
}));

const typeDef: RuntimeTypeViewV1 = {
  typeId: "note",
  fields: { name: "Note" },
  body: ""
};

describe("RecordEditor schema-agnostic editing (UI-RAW-001)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateRecord.mockResolvedValue({ ok: true });
    mockCreateRecord.mockResolvedValue({ ok: true, recordKey: "note:new-id" });
  });

  it("UI-RAW-001: edits arbitrary fields without kind semantics", async () => {
    const record: RuntimeRecordViewV1 = {
      recordKey: "note:record-1",
      recordId: "record-1",
      typeId: "note",
      fields: { weird: "before" },
      body: "existing body"
    };
    render(
      <RecordEditor mode="edit" record={record} typeDef={typeDef} onCancel={() => {}} onComplete={() => {}} />
    );

    const fieldsEditor = await screen.findByTestId("fields-yaml-editor");
    expect(fieldsEditor).toHaveValue("weird: before\n");

    fireEvent.change(fieldsEditor, { target: { value: "weird: after\nother: 123" } });
    fireEvent.click(screen.getByTestId("save-record"));

    await waitFor(() => expect(mockUpdateRecord).toHaveBeenCalledTimes(1));
    expect(mockUpdateRecord).toHaveBeenCalledWith({
      recordKey: record.recordKey,
      nextFields: { weird: "after", other: 123 },
      nextBody: "existing body"
    });
  });

  it("UI-RAW-001: edits fields outside any schema and persists them", async () => {
    const record: RuntimeRecordViewV1 = {
      recordKey: "note:record-2",
      recordId: "record-2",
      typeId: "note",
      fields: { count: 5, extra: { nested: true } },
      body: ""
    };
    render(
      <RecordEditor mode="edit" record={record} typeDef={typeDef} onCancel={() => {}} onComplete={() => {}} />
    );

    const fieldsEditor = await screen.findByTestId("fields-yaml-editor");
    const updatedRaw = "count: not-a-number\nextra:\n  nested: false\nanother:\n  - x\n  - y\n";
    fireEvent.change(fieldsEditor, { target: { value: updatedRaw } });
    fireEvent.click(screen.getByTestId("save-record"));

    await waitFor(() => expect(mockUpdateRecord).toHaveBeenCalledTimes(1));
    expect(mockUpdateRecord).toHaveBeenCalledWith({
      recordKey: record.recordKey,
      nextFields: { count: "not-a-number", extra: { nested: false }, another: ["x", "y"] },
      nextBody: ""
    });
  });

  it("UI-RAW-001: removes fields when YAML omits them", async () => {
    const record: RuntimeRecordViewV1 = {
      recordKey: "note:record-3",
      recordId: "record-3",
      typeId: "note",
      fields: { keep: 1, drop: true },
      body: "body"
    };

    render(<RecordEditor mode="edit" record={record} typeDef={typeDef} onCancel={() => {}} onComplete={() => {}} />);

    const fieldsEditor = await screen.findByTestId("fields-yaml-editor");
    fireEvent.change(fieldsEditor, { target: { value: "keep: 1\n" } });
    fireEvent.click(screen.getByTestId("save-record"));

    await waitFor(() => expect(mockUpdateRecord).toHaveBeenCalledTimes(1));
    expect(mockUpdateRecord).toHaveBeenCalledWith({
      recordKey: record.recordKey,
      nextFields: { keep: 1 },
      nextBody: "body"
    });
  });
});
