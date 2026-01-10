import assert from "node:assert/strict";
import { test } from "vitest";

import {
  buildRecordLinkGraphFromSnapshot,
  blockPathForCid,
  canonicalizeDatasetSnapshot,
  cidFromRawBytes,
  buildDatasetZipBytes,
  loadDatasetSnapshotFromZipBytes
} from "..";
import type { BuildRecordLinkGraphResult, DatasetSnapshot } from "..";

const encoder = new TextEncoder();

type SnapshotEntry = [string, string | Uint8Array];

function makeSnapshot(entries: SnapshotEntry[]): DatasetSnapshot {
  return {
    files: new Map<string, Uint8Array>(
      entries.map(([p, c]) => [p, typeof c === "string" ? encoder.encode(c) : c])
    )
  };
}

function exportAndLoad(rawSnapshot: DatasetSnapshot) {
  const canonical = canonicalizeDatasetSnapshot(rawSnapshot);
  const normalized: DatasetSnapshot = {
    files: new Map(
      [...canonical.files.entries()].map(([path, bytes]) => [
        path,
        bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
      ])
    )
  };
  const zipBytes = buildDatasetZipBytes(normalized);
  return { canonical: normalized, roundTripped: loadDatasetSnapshotFromZipBytes(zipBytes), zipBytes };
}

function expectGraphOk(
  result: BuildRecordLinkGraphResult
): asserts result is Extract<BuildRecordLinkGraphResult, { ok: true }> {
  if (!result.ok) {
    throw new Error(JSON.stringify(result.errors));
  }
}

test('EXP-006: export includes reachable blocks', () => {
  const blobBytes = encoder.encode("flower");
  const cid = cidFromRawBytes(blobBytes);
  const blockPath = blockPathForCid(cid);

  const snapshot = makeSnapshot([
    ["types/note.md", ["---", "typeId: note", "fields: {}", "---", ""].join("\n")],
    [
      "records/note-1.md",
      ["---", "typeId: note", "recordId: one", "fields: {}", "---", `See [[${cid}]].`].join("\n")
    ],
    [blockPath, blobBytes]
  ]);

  const { roundTripped } = exportAndLoad(snapshot);
  const paths = [...roundTripped.files.keys()];
  assert.ok(paths.includes(blockPath));
  assert.ok(paths.includes("types/note.md"));
  assert.ok(paths.includes("records/note.one/one.md"));
  const roundTrippedBlock = roundTripped.files.get(blockPath);
  assert.ok(roundTrippedBlock);
  assert.equal(Buffer.compare(Buffer.from(roundTrippedBlock!), Buffer.from(blobBytes)), 0);
});

test('GC-002: export excludes unreferenced blocks', () => {
  const blobBytes = encoder.encode("flower");
  const cid = cidFromRawBytes(blobBytes);
  const blockPath = blockPathForCid(cid);
  const garbageBytes = encoder.encode("garbage block");
  const garbageCid = cidFromRawBytes(garbageBytes);
  const garbagePath = blockPathForCid(garbageCid);

  const snapshot = makeSnapshot([
    ["types/note.md", ["---", "typeId: note", "fields: {}", "---", ""].join("\n")],
    [
      "records/note-1.md",
      ["---", "typeId: note", "recordId: one", "fields: {}", "---", `See [[${cid}]].`].join("\n")
    ],
    [blockPath, blobBytes],
    [garbagePath, garbageBytes]
  ]);

  const { roundTripped } = exportAndLoad(snapshot);
  const paths = [...roundTripped.files.keys()];
  assert.ok(!paths.includes(garbagePath));
});

test('EXP-003: canonical dataset export round-trips bytes and graph', () => {
  const snapshot = makeSnapshot([
    ["types/note.md", ["---", "typeId: note", "fields: {}", "---", ""].join("\n")],
    ["records/note.one/one.md", ["---", "typeId: note", "recordId: one", "fields: {}", "---", "Body"].join("\n")]
  ]);

  const { canonical, roundTripped } = exportAndLoad(snapshot);
  const graph = buildRecordLinkGraphFromSnapshot(roundTripped);
  expectGraphOk(graph);
  const expectedPaths = ["records/note.one/one.md", "types/note.md"].sort();
  const canonicalPaths = [...canonical.files.keys()].sort();
  const roundTripPaths = [...roundTripped.files.keys()].sort();
  assert.deepEqual(roundTripPaths, expectedPaths);
  assert.deepEqual(canonicalPaths, expectedPaths);
  for (const key of expectedPaths) {
    const expected = canonical.files.get(key);
    const actual = roundTripped.files.get(key);
    assert.ok(expected);
    assert.ok(actual);
    assert.equal(Buffer.compare(Buffer.from(expected), Buffer.from(actual)), 0);
  }
});
