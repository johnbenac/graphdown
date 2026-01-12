import assert from "node:assert/strict";
import { test } from "vitest";

import { validateDatasetSnapshot } from "..";
import type { DatasetSnapshot, ValidateDatasetResult, ValidationError } from "..";

const encoder = new TextEncoder();

type SnapshotEntry = [string, string];

function snapshot(entries: SnapshotEntry[]): DatasetSnapshot {
  return { files: new Map<string, Uint8Array>(entries.map(([path, content]) => [path, encoder.encode(content)])) };
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

test('EXT-001: extra top-level keys are forbidden', () => {
  const typeEntry: SnapshotEntry = [
    "types/widget.md",
    [
      "---",
      "typeId: widget",
      "fields: {}",
      "notes: custom type metadata",
      "---",
      "Widget type"
    ].join("\n")
  ];

  const recordEntry: SnapshotEntry = [
    "records/widget-1.md",
    [
      "---",
      "typeId: widget",
      "recordId: one",
      "fields: {}",
      "source: importer",
      "---",
      "Widget record"
    ].join("\n")
  ];

  const result = validateDatasetSnapshot(snapshot([typeEntry, recordEntry]));

  const errors = expectErrors(result);
  assert.ok(errors.some((e) => e.code === "E_FORBIDDEN_TOP_LEVEL_KEY"));
});

test('EXT-002: accepts arbitrary shapes within fields', () => {
  const typeEntry: SnapshotEntry = [
    "types/gizmo.md",
    [
      "---",
      "typeId: gizmo",
      "fields: {}",
      "---",
      "Gizmo type"
    ].join("\n")
  ];

  const recordEntry: SnapshotEntry = [
    "records/gizmo/gizmo-1.md",
    [
      "---",
      "typeId: gizmo",
      "recordId: one",
      "fields:",
      "  name: Gizmo One",
      "  count: 3",
      "  active: true",
      "  nothing: null",
      "  tags:",
      "    - alpha",
      "    - 2",
      "    - { nested: yes }",
      "  metadata:",
      "    owner: qa",
      "    notes:",
      "      - { label: first, score: 10 }",
      "      - { label: second, score: 20 }",
      "---",
      "Gizmo record"
    ].join("\n")
  ];

  const result = validateDatasetSnapshot(snapshot([typeEntry, recordEntry]));

  expectOk(result);
});
