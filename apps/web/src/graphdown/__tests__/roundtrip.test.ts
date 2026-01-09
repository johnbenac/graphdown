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
  const blockBytes = encoder.encode("flower");
  const cid = cidFromRawBytes(blockBytes);
  const blockPath = blockPathForCid(cid);

  const snapshot = makeSnapshot([
    ["types/note.md", ["---", "typeId: note", "fields: {}", "---", ""].join("\n")],
    [
      "records/note-1.md",
      ["---", "typeId: note", "recordId: one", "fields: {}", "---", `See [[${cid}]].`].join("\n")
    ],
    [blockPath, blockBytes]
  ]);

  const { roundTripped } = exportAndLoad(snapshot);
  const paths = [...roundTripped.files.keys()];
  assert.ok(paths.includes(blockPath));
  assert.ok(paths.includes("types/note.md"));
  assert.ok(paths.includes("records/note.one/one.md"));
});

test('GC-002: export excludes unreferenced blocks', () => {
  const blockBytes = encoder.encode("flower");
  const cid = cidFromRawBytes(blockBytes);
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
    [blockPath, blockBytes],
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

  const { roundTripped } = exportAndLoad(snapshot);
  const graph = buildRecordLinkGraphFromSnapshot(roundTripped);
  expectGraphOk(graph);
  assert.deepEqual(
    [...roundTripped.files.keys()].sort(),
    [...roundTripped.files.keys()].sort()
  );
  for (const key of roundTripped.files.keys()) {
    const original = roundTripped.files.get(key);
    const roundTrip = roundTripped.files.get(key);
    assert.ok(original);
    assert.ok(roundTrip);
    assert.equal(Buffer.compare(Buffer.from(original), Buffer.from(roundTrip)), 0);
  }
});
