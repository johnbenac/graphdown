import { describe, expect, it } from "vitest";
import { discoverGraphdownObjects, validateDatasetSnapshot } from "../../index";
import type { DatasetSnapshot } from "../../index";
import { loadFixtureSnapshot } from "../fixtureLoader";

const encoder = new TextEncoder();

function snapshotFromEntries(entries: Array<[string, string]>): DatasetSnapshot {
  return {
    files: new Map(entries.map(([path, content]) => [path, encoder.encode(content)]))
  };
}

function rec(path: string, yamlLines: string[], body = ""): [string, string] {
  return [
    path,
    ["---", ...yamlLines, "---", body].join("\n")
  ];
}

function getErrorCodes(snapshot: DatasetSnapshot) {
  const result = validateDatasetSnapshot(snapshot);
  if (result.ok) return [];
  return result.errors.map((error) => error.code);
}

describe("validateDatasetSnapshot", () => {
  it("LAYOUT-003: malformed front matter in non-semantic markdown is ignored", () => {
    const snapshot = loadFixtureSnapshot("frontmatter-permissive-dataset");
    const result = validateDatasetSnapshot(snapshot);
    expect(result.ok).toBe(true);

    const discovered = discoverGraphdownObjects(snapshot);
    expect(discovered.errors).toEqual([]);
    expect(discovered.ignored).toEqual(
      expect.arrayContaining(["docs/bad-frontmatter.md", "notes/obsidian.md"])
    );
  });

  it("FR-MD-021: fields must be an object", () => {
    const snapshot = snapshotFromEntries([rec("type.md", ["typeId: note", "fields: []"])]);
    expect(getErrorCodes(snapshot)).toContain("E_REQUIRED_FIELD_MISSING");
  });

  it("FR-MD-023: recordId must be a string identifier when present", () => {
    const snapshot = snapshotFromEntries([rec("record.md", ["typeId: note", "recordId: 123", "fields: {}"])]);
    expect(getErrorCodes(snapshot)).toContain("E_INVALID_IDENTIFIER");
  });

  it("FR-MD-023: missing fields in a discovered record fails validation", () => {
    const snapshot = snapshotFromEntries([rec("record.md", ["typeId: note", "recordId: one"])]);
    expect(getErrorCodes(snapshot)).toContain("E_REQUIRED_FIELD_MISSING");
  });

  it("LAYOUT-001: no recordId means the object is treated as a type", () => {
    const snapshot = snapshotFromEntries([rec("records/note.md", ["typeId: note", "fields: {}"])]);
    expect(getErrorCodes(snapshot)).toEqual([]);
  });

  it("EXT-001: extra top-level keys are rejected", () => {
    const snapshot = snapshotFromEntries([rec("type.md", ["typeId: note", "fields: {}", "extra: nope"])]);
    expect(getErrorCodes(snapshot)).toContain("E_FORBIDDEN_TOP_LEVEL_KEY");
  });

  it("FR-MD-021: type objects must not define parent", () => {
    const snapshot = snapshotFromEntries([
      rec("type.md", ["typeId: note", "parent: note:one", "fields: {}"])
    ]);
    expect(getErrorCodes(snapshot)).toContain("E_FORBIDDEN_TOP_LEVEL_KEY");
  });

  it("FR-MD-023: record objects may include parent", () => {
    const snapshot = snapshotFromEntries([
      rec("type.md", ["typeId: note", "fields: {}"]),
      rec("parent.md", ["typeId: note", "recordId: parent", "fields: {}"]),
      rec("child.md", ["typeId: note", "recordId: child", "parent: note:parent", "fields: {}"])
    ]);
    const result = validateDatasetSnapshot(snapshot);
    expect(result.ok).toBe(true);
  });

  it("HIER-001: parent missing and parent null both define hierarchy roots", () => {
    const snapshot = snapshotFromEntries([
      rec("type.md", ["typeId: note", "fields: {}"]),
      rec("root-a.md", ["typeId: note", "recordId: a", "fields: {}"]),
      rec("root-b.md", ["typeId: note", "recordId: b", "parent: null", "fields: {}"])
    ]);
    const result = validateDatasetSnapshot(snapshot);
    expect(result.ok).toBe(true);
  });

  it("VAL-PARENT-001: invalid parent shapes fail validation", () => {
    const type = rec("type.md", ["typeId: note", "fields: {}"]);
    const invalidParents = [
      rec("r1.md", ["typeId: note", "recordId: one", "parent: 123", "fields: {}"]),
      rec("r2.md", ["typeId: note", "recordId: two", "parent: {}", "fields: {}"]),
      rec("r3.md", ["typeId: note", "recordId: three", "parent: \"\"", "fields: {}"]),
      rec("r4.md", ["typeId: note", "recordId: four", "parent: no-colon", "fields: {}"]),
      rec("r5.md", ["typeId: note", "recordId: five", "parent: \"bad type!:id\"", "fields: {}"])
    ];
    for (const record of invalidParents) {
      expect(getErrorCodes(snapshotFromEntries([type, record]))).toContain("E_PARENT_INVALID");
    }
  });

  it("VAL-PARENT-002: parent pointers must resolve to an existing record", () => {
    const snapshot = snapshotFromEntries([
      rec("type.md", ["typeId: note", "fields: {}"]),
      rec("r1.md", ["typeId: note", "recordId: one", "parent: note:missing", "fields: {}"])
    ]);
    expect(getErrorCodes(snapshot)).toContain("E_PARENT_MISSING");
  });

  it("VAL-PARENT-003: parent pointer cycles fail validation", () => {
    const snapshot = snapshotFromEntries([
      rec("type.md", ["typeId: note", "fields: {}"]),
      rec("r1.md", ["typeId: note", "recordId: one", "parent: note:two", "fields: {}"]),
      rec("r2.md", ["typeId: note", "recordId: two", "parent: note:one", "fields: {}"])
    ]);
    expect(getErrorCodes(snapshot)).toContain("E_PARENT_CYCLE");
  });

  it("VAL-PARENT-003: parent pointer self-cycle fails validation", () => {
    const snapshot = snapshotFromEntries([
      rec("type.md", ["typeId: note", "fields: {}"]),
      rec("r1.md", ["typeId: note", "recordId: one", "parent: note:one", "fields: {}"])
    ]);
    expect(getErrorCodes(snapshot)).toContain("E_PARENT_CYCLE");
  });

  it("VAL-002: duplicate record identity fails validation", () => {
    const type = rec("type.md", ["typeId: note", "fields: {}"]);
    const record = rec("r.md", ["typeId: note", "recordId: one", "fields: {}"]);
    const dup = rec("r2.md", ["typeId: note", "recordId: one", "fields: {}"]);
    const snapshot = snapshotFromEntries([type, record, dup]);
    expect(getErrorCodes(snapshot)).toContain("E_DUPLICATE_ID");
  });

  it("VAL-003: record referencing missing type fails validation", () => {
    const snapshot = snapshotFromEntries([rec("r.md", ["typeId: missing", "recordId: one", "fields: {}"])]);
    expect(getErrorCodes(snapshot)).toContain("E_TYPEID_MISMATCH");
  });

  it("VAL-005: required fields enforced when fieldDefs.required = true", () => {
    const type = rec("type.md", ["typeId: note", "fields:", "  fieldDefs:", "    title:", "      required: true"]);
    const missing = rec("r.md", ["typeId: note", "recordId: one", "fields: {}"]);
    const present = rec("r2.md", ["typeId: note", "recordId: two", "fields:", "  title: Hi"]);

    expect(getErrorCodes(snapshotFromEntries([type, missing]))).toContain("E_REQUIRED_FIELD_MISSING");
    const ok = validateDatasetSnapshot(snapshotFromEntries([type, present]));
    expect(ok.ok).toBe(true);
  });

  it("VAL-006: semantic validation of field values is not enforced", () => {
    const type = rec("type.md", [
      "typeId: note",
      "fields:",
      "  fieldDefs:",
      "    title:",
      "      kind: string",
      "    estimate:",
      "      kind: number",
      "    status:",
      "      kind: enum",
      "      options: [todo, done]",
      "    due:",
      "      kind: date",
      "    assignee:",
      "      kind: ref"
    ]);
    const record = rec("r.md", [
      "typeId: note",
      "recordId: one",
      "fields:",
      "  title: 123",
      "  estimate: not-a-number",
      "  status: unknown",
      "  due: not-a-date",
      "  assignee: 42"
    ]);

    const result = validateDatasetSnapshot(snapshotFromEntries([type, record]));
    expect(result.ok).toBe(true);
  });
});
