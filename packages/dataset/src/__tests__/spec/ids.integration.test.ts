import assert from "node:assert/strict";
import { test } from "vitest";

import { parseGraphMDText } from "../../parse/datasetObjects.js";
import { validateDatasetSnapshot } from "../../validate/validateDatasetSnapshot.js";
import type { DatasetSnapshot } from "../../model/snapshotTypes.js";
import type { ValidateDatasetResult } from "../../validate/validateDatasetSnapshot.js";
import type { ValidationError } from "../../validate/errors.js";

const encoder = new TextEncoder();

type SnapshotEntry = [string, string];

function snapshot(entries: SnapshotEntry[]): DatasetSnapshot {
  return { files: new Map<string, Uint8Array>(entries.map(([path, content]) => [path, encoder.encode(content)])) };
}

function parse(text: string) {
  return parseGraphMDText("test.md", text);
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

test('ID-001: rejects typeId with invalid characters', () => {
  const result = parse(
    ["---", "typeId: invalid id", "fields: {}", "---", "body"].join("\n")
  );
  assert.equal(result.kind, "error");
  assert.equal(result.error.code, "E_INVALID_IDENTIFIER");
});

test('ID-001: rejects recordId with colon', () => {
  const result = parse(
    ["---", "typeId: note", "recordId: bad:id", "fields: {}", "---", "body"].join("\n")
  );
  assert.equal(result.kind, "error");
  assert.equal(result.error.code, "E_INVALID_IDENTIFIER");
});

test('ID-001: accepts valid identifiers', () => {
  const typeResult = parse(["---", "typeId: note", "fields: {}", "---", "body"].join("\n"));
  assert.equal(typeResult.kind, "type");
  const recordResult = parse(
    ["---", "typeId: note", "recordId: rec_1", "fields: {}", "---", "body"].join("\n")
  );
  assert.equal(recordResult.kind, "record");
});

test('TYPE-002: duplicate typeId fails validation', () => {
  const typeA: SnapshotEntry = ["types/a.md", ["---", "typeId: note", "fields: {}", "---"].join("\n")];
  const typeB: SnapshotEntry = ["types/b.md", ["---", "typeId: note", "fields: {}", "---"].join("\n")];
  const result = validateDatasetSnapshot(snapshot([typeA, typeB]));
  const errors = expectErrors(result);
  assert.ok(errors.some((e) => e.code === "E_DUPLICATE_ID"));
});

test('TYPE-001: type object without recordId is valid', () => {
  const type: SnapshotEntry = ["types/note.md", ["---", "typeId: note", "fields: {}", "---"].join("\n")];
  const result = validateDatasetSnapshot(snapshot([type]));
  expectOk(result);
});
