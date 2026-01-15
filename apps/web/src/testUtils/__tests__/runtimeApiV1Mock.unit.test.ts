import { describe, expect, it } from "vitest";
import { createRuntimeApiV1Mock } from "../runtimeApiV1Mock";

const encoder = new TextEncoder();

describe("createRuntimeApiV1Mock", () => {
  it("derives record identity from YAML content instead of the file path", async () => {
    const markdown = [
      "---",
      "typeId: note",
      "recordId: one",
      "fields:",
      "  title: Hello",
      "---",
      "Body"
    ].join("\n");
    const snapshot = {
      files: new Map([["records/weird/location/file.md", encoder.encode(markdown)]])
    };

    const api = createRuntimeApiV1Mock(snapshot);
    const record = await api.getRecord("note:one");
    expect(record).not.toBeNull();

    const bytes = await api.getRecordMarkdownBytes("note:one");
    expect(bytes).toEqual(encoder.encode(markdown));
  });
});
