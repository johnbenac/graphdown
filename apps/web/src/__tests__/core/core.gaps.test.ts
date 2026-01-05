import { describe, expect, it } from "vitest";
import { validateDatasetSnapshot } from "../../core";

const encoder = new TextEncoder();

function snapshot(entries: Array<[string, string]>) {
  return { files: new Map(entries.map(([path, content]) => [path, encoder.encode(content)])) };
}

function record(path: string, yamlLines: string[], body = "") {
  return [path, ["---", ...yamlLines, "---", body].join("\n")] as [string, string];
}

describe("core gaps", () => {
  it("NR-LINK-001: missing record links are allowed (except composition)", () => {
    const result = validateDatasetSnapshot(
      snapshot([
        record("types/note.md", ["typeId: note", "fields: {}"]),
        record(
          "records/note-1.md",
          ["typeId: note", "recordId: one", "fields: {}"],
          "See [[note:missing]]."
        )
      ])
    );
    expect(result.ok).toBe(true);
  });

  it("TYPE-004 + VAL-005: fieldDefs map enforces required=true only", () => {
    const type = record("types/task.md", [
      "typeId: task",
      "fields:",
      "  fieldDefs:",
      "    title:",
      "      required: true"
    ]);
    const missing = record("records/task-1.md", ["typeId: task", "recordId: t1", "fields: {}"]);
    const present = record("records/task-2.md", [
      "typeId: task",
      "recordId: t2",
      "fields:",
      "  title: Hi"
    ]);

    const failResult = validateDatasetSnapshot(snapshot([type, missing]));
    expect(failResult.ok).toBe(false);
    if (!failResult.ok) {
      expect(failResult.errors.some((error) => error.code === "E_REQUIRED_FIELD_MISSING")).toBe(true);
    }

    const passResult = validateDatasetSnapshot(snapshot([type, present]));
    expect(passResult.ok).toBe(true);
  });

  it("TYPE-004: fieldDefs must be map of objects; required must be boolean when present", () => {
    const invalid = record("types/task.md", ["typeId: task", "fields:", "  fieldDefs:", "    title: 123"]);
    const invalidRequired = record("types/flag.md", [
      "typeId: flag",
      "fields:",
      "  fieldDefs:",
      "    on:",
      "      required: \"yes\""
    ]);

    const result = validateDatasetSnapshot(snapshot([invalid]));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.code === "E_REQUIRED_FIELD_MISSING")).toBe(true);
    }

    const result2 = validateDatasetSnapshot(snapshot([invalidRequired]));
    expect(result2.ok).toBe(false);
    if (!result2.ok) {
      expect(result2.errors.some((error) => error.code === "E_REQUIRED_FIELD_MISSING")).toBe(true);
    }
  });

  it("NR-SEM-001: semantic shapes are ignored by validation", () => {
    const type = record("types/flag.md", [
      "typeId: flag",
      "fields:",
      "  fieldDefs:",
      "    enabled:",
      "      required: true",
      "      kind: boolean"
    ]);
    const recordNonBool = record("records/flag-1.md", [
      "typeId: flag",
      "recordId: one",
      "fields:",
      "  enabled: \"not bool\""
    ]);
    const result = validateDatasetSnapshot(snapshot([type, recordNonBool]));
    expect(result.ok).toBe(true);
  });

  it("NR-UI-002: arbitrary keys inside fields are accepted", () => {
    const type = record("types/note.md", ["typeId: note", "fields: {}"]);
    const rec = record("records/note-1.md", [
      "typeId: note",
      "recordId: one",
      "fields:",
      "  title: Note",
      "  ui:",
      "    widget: textarea"
    ]);
    const result = validateDatasetSnapshot(snapshot([type, rec]));
    expect(result.ok).toBe(true);
  });
});
