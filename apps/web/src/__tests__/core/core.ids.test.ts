import { describe, expect, it } from "vitest";
import { parseGraphdownText } from "../../core/datasetObjects";
import { validateDatasetSnapshot } from "../../core/validateDatasetSnapshot";

const encoder = new TextEncoder();

function snapshot(entries: Array<[string, string]>) {
  return { files: new Map(entries.map(([path, content]) => [path, encoder.encode(content)])) };
}

function parse(text: string) {
  return parseGraphdownText("test.md", text);
}

describe("ids", () => {
  it("ID-001: rejects typeId with invalid characters", () => {
    const result = parse(["---", "typeId: invalid id", "fields: {}", "---", "body"].join("\n"));
    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.error.code).toBe("E_INVALID_IDENTIFIER");
    }
  });

  it("ID-001: rejects recordId with colon", () => {
    const result = parse(
      ["---", "typeId: note", "recordId: bad:id", "fields: {}", "---", "body"].join("\n")
    );
    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.error.code).toBe("E_INVALID_IDENTIFIER");
    }
  });

  it("ID-002: rejects reserved gdblob typeId", () => {
    const result = parse(["---", "typeId: gdblob", "fields: {}", "---", "body"].join("\n"));
    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.error.code).toBe("E_INVALID_IDENTIFIER");
    }
  });

  it("ID-001: accepts valid identifiers", () => {
    const typeResult = parse(["---", "typeId: note", "fields: {}", "---", "body"].join("\n"));
    expect(typeResult.kind).toBe("type");
    const recordResult = parse(
      ["---", "typeId: note", "recordId: rec_1", "fields: {}", "---", "body"].join("\n")
    );
    expect(recordResult.kind).toBe("record");
  });

  it("TYPE-002: duplicate typeId fails validation", () => {
    const typeA: [string, string] = ["types/a.md", ["---", "typeId: note", "fields: {}", "---"].join("\n")];
    const typeB: [string, string] = ["types/b.md", ["---", "typeId: note", "fields: {}", "---"].join("\n")];
    const result = validateDatasetSnapshot(snapshot([typeA, typeB]));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.code === "E_DUPLICATE_ID")).toBe(true);
    }
  });

  it("TYPE-001: type object without recordId is valid", () => {
    const type: [string, string] = ["types/note.md", ["---", "typeId: note", "fields: {}", "---"].join("\n")];
    const result = validateDatasetSnapshot(snapshot([type]));
    expect(result.ok).toBe(true);
  });
});
