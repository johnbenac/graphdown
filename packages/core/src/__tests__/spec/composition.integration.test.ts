import assert from "node:assert/strict";
import { test } from "vitest";

import { validateDatasetSnapshot } from "../..";
import type { DatasetSnapshot, ValidateDatasetResult, ValidationError } from "../..";

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

test('VAL-COMP-002: required component link resolves to correct type', () => {
  const result = validateDatasetSnapshot(
    snapshot([
      record("any/engine.md", ["typeId: engine", "fields: {}"]),
      record("any/car.md", ["typeId: car", "fields:", "  composition:", "    engine:", "      typeId: engine", "      required: true"]),
      record("records/engine/e1.md", ["typeId: engine", "recordId: e1", "fields: {}"]),
      record("records/car/c1.md", ["typeId: car", "recordId: c1", "fields: {}"], "Has [[engine:e1]].")
    ])
  );
  expectOk(result);
});

test('VAL-COMP-002: missing required component link fails', () => {
  const result = validateDatasetSnapshot(
    snapshot([
      record("types/engine.md", ["typeId: engine", "fields: {}"]),
      record("types/car.md", ["typeId: car", "fields:", "  composition:", "    engine:", "      typeId: engine", "      required: true"]),
      record("records/car/c1.md", ["typeId: car", "recordId: c1", "fields: {}"], "No links here.")
    ])
  );
  const errors = expectErrors(result);
  assert.ok(errors.some((e) => e.code === "E_COMPOSITION_CONSTRAINT_VIOLATION"));
});

test('VAL-COMP-002: link to wrong type does not satisfy requirement', () => {
  const result = validateDatasetSnapshot(
    snapshot([
      record("types/engine.md", ["typeId: engine", "fields: {}"]),
      record("types/car.md", ["typeId: car", "fields:", "  composition:", "    engine:", "      typeId: engine", "      required: true"]),
      record("records/car/c1.md", ["typeId: car", "recordId: c1", "fields: {}"], "Points to [[car:self]]")
    ])
  );
  const errors = expectErrors(result);
  assert.ok(errors.some((e) => e.code === "E_COMPOSITION_CONSTRAINT_VIOLATION"));
});

test('VAL-COMP-001: composition referenced types must exist', () => {
  const result = validateDatasetSnapshot(
    snapshot([
      record("types/car.md", ["typeId: car", "fields:", "  composition:", "    engine:", "      typeId: engine", "      required: true"]),
      record("records/car/c1.md", ["typeId: car", "recordId: c1", "fields: {}"])
    ])
  );
  const errors = expectErrors(result);
  assert.ok(errors.some((e) => e.code === "E_COMPOSITION_UNKNOWN_TYPE"));
});

test('TYPE-COMP-001: composition must be a map with only typeId + required', () => {
  const invalid = validateDatasetSnapshot(
    snapshot([
      record("types/car.md", ["typeId: car", "fields:", "  composition: []"])
    ])
  );
  const invalidErrors = expectErrors(invalid);
  assert.ok(invalidErrors.some((e) => e.code === "E_COMPOSITION_SCHEMA_INVALID"));

  const extraKey = validateDatasetSnapshot(
    snapshot([
      record(
        "types/car.md",
        ["typeId: car", "fields:", "  composition:", "    engine:", "      typeId: engine", "      required: true", "      max: 2"]
      )
    ])
  );
  const extraKeyErrors = expectErrors(extraKey);
  assert.ok(extraKeyErrors.some((e) => e.code === "E_COMPOSITION_SCHEMA_INVALID"));
});

test('TYPE-COMP-001: composition component must include required boolean', () => {
  const missingRequired = validateDatasetSnapshot(
    snapshot([
      record("types/car.md", ["typeId: car", "fields:", "  composition:", "    engine:", "      typeId: engine"])
    ])
  );
  const missingErrors = expectErrors(missingRequired);
  assert.ok(missingErrors.some((e) => e.code === "E_COMPOSITION_SCHEMA_INVALID"));
});
