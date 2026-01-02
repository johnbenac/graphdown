import { describe, expect, it } from "vitest";
import { validateDatasetSnapshot } from "../../../../src/core/validateDatasetSnapshot";
import type { RepoSnapshot } from "../../../../src/core/snapshotTypes";

const encoder = new TextEncoder();

function snapshotFromEntries(entries: Array<[string, string]>): RepoSnapshot {
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

function getErrorCodes(snapshot: RepoSnapshot) {
  const result = validateDatasetSnapshot(snapshot);
  if (result.ok) return [];
  return result.errors.map((error) => error.code);
}

describe("validateDatasetSnapshot", () => {
  it("FR-MD-020: missing YAML front matter fails validation", () => {
    const snapshot = snapshotFromEntries([["note.md", "no front matter"]]);
    expect(getErrorCodes(snapshot)).toContain("E_FRONT_MATTER_MISSING");
  });

  it("FR-MD-020: invalid YAML fails validation", () => {
    const snapshot = snapshotFromEntries([["note.md", "---\nfoo: [\n---"]]);
    expect(getErrorCodes(snapshot)).toContain("E_YAML_INVALID");
  });

  it("FR-MD-021: fields must be an object", () => {
    const snapshot = snapshotFromEntries([rec("type.md", ["typeId: note", "fields: []"])]);
    expect(getErrorCodes(snapshot)).toContain("E_REQUIRED_FIELD_MISSING");
  });

  it("FR-MD-023: record requires recordId", () => {
    const snapshot = snapshotFromEntries([rec("record.md", ["typeId: note", "fields: {}"])]);
    expect(getErrorCodes(snapshot)).toContain("E_INVALID_IDENTIFIER");
  });

  it("EXT-001: extra top-level keys are rejected", () => {
    const snapshot = snapshotFromEntries([rec("type.md", ["typeId: note", "fields: {}", "extra: nope"])]);
    expect(getErrorCodes(snapshot)).toContain("E_FORBIDDEN_TOP_LEVEL_KEY");
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
});
