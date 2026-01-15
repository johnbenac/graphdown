import { describe, expect, it } from "vitest";
import { createRuntimeApiV1Mock } from "../runtimeApiV1Mock";

const encoder = new TextEncoder();

describe("createRuntimeApiV1Mock", () => {
  it("derives record identity from YAML instead of file paths", async () => {
    const path = "records/weird/location/file.md";
    const contents = encoder.encode(
      [
        "---",
        "typeId: note",
        "recordId: one",
        "fields:",
        "  title: Hello",
        "---",
        "Body"
      ].join("\n")
    );
    const snapshot = { files: new Map([[path, contents]]) };
    const api = createRuntimeApiV1Mock(snapshot);

    const record = await api.getRecord("note:one");
    expect(record).not.toBeNull();
    expect(record?.recordKey).toBe("note:one");

    const markdownBytes = await api.getRecordMarkdownBytes("note:one");
    expect(markdownBytes).toEqual(contents);
  });
});
