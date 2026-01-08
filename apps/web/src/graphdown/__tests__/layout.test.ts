import assert from "node:assert/strict";
import { test } from "vitest";

import { validateDatasetSnapshot, buildRecordLinkGraphFromSnapshot } from "..";
import type { BuildRecordLinkGraphResult, DatasetSnapshot, ValidateDatasetResult } from "..";

const encoder = new TextEncoder();

type SnapshotEntry = [string, string];

function snapshot(entries: SnapshotEntry[]): DatasetSnapshot {
  return { files: new Map<string, Uint8Array>(entries.map(([path, content]) => [path, encoder.encode(content)])) };
}

function expectValidationOk(result: ValidateDatasetResult): void {
  if (!result.ok) {
    assert.fail(JSON.stringify(result.errors));
  }
}

function expectGraphOk(
  result: BuildRecordLinkGraphResult
): asserts result is Extract<BuildRecordLinkGraphResult, { ok: true }> {
  if (!result.ok) {
    assert.fail(JSON.stringify(result.errors));
  }
}

test('LAYOUT-002: only first front matter block defines a record object', () => {
  const recordContent = [
    "---",
    "typeId: note",
    "recordId: one",
    "fields: {}",
    "---",
    "Body with a second YAML-looking block that must be treated as markdown only.",
    "---",
    "typeId: note",
    "recordId: two",
    "fields: {}",
    "---",
    "Trailing text.",
  ].join("\n");

  const snap = snapshot([
    ["types/note.md", ["---", "typeId: note", "fields: {}", "---", ""].join("\n")],
    ["records/multi.md", recordContent],
  ]);

  const validation = validateDatasetSnapshot(snap);
  expectValidationOk(validation);

  const graphResult = buildRecordLinkGraphFromSnapshot(snap);
  expectGraphOk(graphResult);
  const { graph } = graphResult;

  assert.ok(graph.getRecord("note:one"));
  assert.equal(graph.getRecord("note:two"), null);
  assert.deepEqual(graph.getOutgoingRecordLinks("note:one"), []);
});
