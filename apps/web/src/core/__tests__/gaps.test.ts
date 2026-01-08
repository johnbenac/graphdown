import assert from "node:assert/strict";
import { test } from "vitest";

import { validateDatasetSnapshot } from "..";
import type { DatasetSnapshot, ValidateDatasetResult, ValidationError } from "..";

const encoder = new TextEncoder();

type SnapshotEntry = [string, string];

function snapshot(entries: SnapshotEntry[]): DatasetSnapshot {
  return { files: new Map<string, Uint8Array>(entries.map(([path, content]) => [path, encoder.encode(content)])) };
}

function record(path: string, yamlLines: string[], body = ""): SnapshotEntry {
  return [
    path,
    ["---", ...yamlLines, "---", body].join("\n")
  ];
}

function expectErrors(result: ValidateDatasetResult): ValidationError[] {
  if (result.ok) {
    assert.fail("Expected validation errors");
  }
  return result.errors;
}

function expectOk(result: ValidateDatasetResult): void {
  if (!result.ok) {
    assert.fail(JSON.stringify(result.errors));
  }
}

test('NR-LINK-001: missing record links are allowed (except composition)', () => {
  const result = validateDatasetSnapshot(
    snapshot([
      record("types/note.md", ["typeId: note", "fields: {}"]),
      record("records/note-1.md", ["typeId: note", "recordId: one", "fields: {}"], "See [[note:missing]].")
    ])
  );
  expectOk(result);
});

test('TYPE-004 + VAL-005: fieldDefs map enforces required=true only', () => {
  const type = record("types/task.md", ["typeId: task", "fields:", "  fieldDefs:", "    title:", "      required: true"]);
  const missing = record("records/task-1.md", ["typeId: task", "recordId: t1", "fields: {}"]);
  const present = record("records/task-2.md", ["typeId: task", "recordId: t2", "fields:", "  title: Hi"]);

  const failResult = validateDatasetSnapshot(snapshot([type, missing]));
  const failErrors = expectErrors(failResult);
  assert.ok(failErrors.some((e) => e.code === "E_REQUIRED_FIELD_MISSING"));

  const passResult = validateDatasetSnapshot(snapshot([type, present]));
  expectOk(passResult);
});

test('TYPE-004: fieldDefs must be map of objects; required must be boolean when present', () => {
  const invalid = record("types/task.md", ["typeId: task", "fields:", "  fieldDefs:", "    title: 123"]);
  const invalidRequired = record(
    "types/flag.md",
    ["typeId: flag", "fields:", "  fieldDefs:", "    on:", '      required: "yes"']
  );

  const result = validateDatasetSnapshot(snapshot([invalid]));
  const errors = expectErrors(result);
  assert.ok(errors.some((e) => e.code === "E_REQUIRED_FIELD_MISSING"));

  const result2 = validateDatasetSnapshot(snapshot([invalidRequired]));
  const errors2 = expectErrors(result2);
  assert.ok(errors2.some((e) => e.code === "E_REQUIRED_FIELD_MISSING"));
});

test('NR-SEM-001: semantic shapes are ignored by validation', () => {
  const type = record(
    "types/flag.md",
    ["typeId: flag", "fields:", "  fieldDefs:", "    enabled:", "      required: true", "      kind: boolean"]
  );
  const recordNonBool = record(
    "records/flag-1.md",
    ["typeId: flag", "recordId: one", "fields:", '  enabled: "not bool"']
  );
  const result = validateDatasetSnapshot(snapshot([type, recordNonBool]));
  expectOk(result);
});

test('NR-UI-002: arbitrary keys inside fields are accepted', () => {
  const type = record("types/note.md", ["typeId: note", "fields: {}"]);
  const rec = record(
    "records/note-1.md",
    ["typeId: note", "recordId: one", "fields:", "  title: Note", "  ui:", "    widget: textarea"]
  );
  const result = validateDatasetSnapshot(snapshot([type, rec]));
  expectOk(result);
});
