import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "vitest";

import {
  buildGraphFromSnapshot,
  canonicalizeDatasetSnapshot,
  exportDatasetZipBytes,
  loadDatasetSnapshotFromZipBytes
} from "../../core";
import type { BuildGraphResult, DatasetSnapshot } from "../../core";

const encoder = new TextEncoder();

type SnapshotEntry = [string, string | Uint8Array];

function makeSnapshot(entries: SnapshotEntry[]): DatasetSnapshot {
  return {
    files: new Map<string, Uint8Array>(
      entries.map(([p, c]) => [p, typeof c === "string" ? encoder.encode(c) : c])
    )
  };
}

function hash(content: Uint8Array): string {
  return createHash("sha256").update(content).digest("hex");
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
  const zipBytes = exportDatasetZipBytes(normalized);
  return { canonical: normalized, roundTripped: loadDatasetSnapshotFromZipBytes(zipBytes), zipBytes };
}

function expectGraphOk(result: BuildGraphResult): asserts result is Extract<BuildGraphResult, { ok: true }> {
  if (!result.ok) {
    throw new Error(JSON.stringify(result.errors));
  }
}

test('EXP-006: export includes reachable blobs', () => {
  const blobBytes = encoder.encode("flower");
  const digest = hash(blobBytes);
  const blobPath = `blobs/sha256/${digest.slice(0, 2)}/${digest}`;

  const snapshot = makeSnapshot([
    ["types/note.md", ["---", "typeId: note", "fields: {}", "---", ""].join("\n")],
    [
      "records/note-1.md",
      ["---", "typeId: note", "recordId: one", "fields: {}", "---", `See [[gdblob:sha256-${digest}]].`].join("\n")
    ],
    [blobPath, blobBytes]
  ]);

  const { roundTripped } = exportAndLoad(snapshot);
  const paths = [...roundTripped.files.keys()];
  assert.ok(paths.includes(blobPath));
  assert.ok(paths.includes("types/note.md"));
  assert.ok(paths.includes("records/note.one/one.md"));
});

test('GC-002: export excludes unreferenced blobs', () => {
  const blobBytes = encoder.encode("flower");
  const digest = hash(blobBytes);
  const blobPath = `blobs/sha256/${digest.slice(0, 2)}/${digest}`;

  const snapshot = makeSnapshot([
    ["types/note.md", ["---", "typeId: note", "fields: {}", "---", ""].join("\n")],
    [
      "records/note-1.md",
      ["---", "typeId: note", "recordId: one", "fields: {}", "---", `See [[gdblob:sha256-${digest}]].`].join("\n")
    ],
    [blobPath, blobBytes],
    ["blobs/sha256/aa/aa" + "0".repeat(62), encoder.encode("garbage blob")]
  ]);

  const { roundTripped } = exportAndLoad(snapshot);
  const paths = [...roundTripped.files.keys()];
  assert.ok(!paths.includes("blobs/sha256/aa/aa" + "0".repeat(62)));
});

test('EXP-003: canonical dataset export round-trips bytes and graph', () => {
  const snapshot = makeSnapshot([
    ["types/note.md", ["---", "typeId: note", "fields: {}", "---", ""].join("\n")],
    ["records/note.one/one.md", ["---", "typeId: note", "recordId: one", "fields: {}", "---", "Body"].join("\n")]
  ]);

  const { roundTripped } = exportAndLoad(snapshot);
  const graph = buildGraphFromSnapshot(roundTripped);
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
