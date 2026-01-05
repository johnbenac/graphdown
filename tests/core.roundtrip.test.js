const assert = require('node:assert/strict');
const test = require('node:test');
const { createHash } = require('node:crypto');

const {
  buildGraphFromSnapshot,
  canonicalizeDatasetSnapshot,
  exportDatasetZipBytes,
  loadDatasetSnapshotFromZipBytes
} = require('../dist/core');

const encoder = new TextEncoder();

function makeSnapshot(entries) {
  return { files: new Map(entries.map(([p, c]) => [p, typeof c === 'string' ? encoder.encode(c) : c])) };
}

function hash(content) {
  return createHash('sha256').update(content).digest('hex');
}

function exportAndLoad(rawSnapshot) {
  const canonical = canonicalizeDatasetSnapshot(rawSnapshot);
  const zipBytes = exportDatasetZipBytes(canonical);
  return loadDatasetSnapshotFromZipBytes(zipBytes);
}

test('EXP-006: export includes reachable blobs', () => {
  const blobBytes = encoder.encode('flower');
  const digest = hash(blobBytes);
  const blobPath = `blobs/sha256/${digest.slice(0, 2)}/${digest}`;

  const snapshot = makeSnapshot([
    ['types/note.md', ['---', 'typeId: note', 'fields: {}', '---', ''].join('\n')],
    ['records/note-1.md', ['---', 'typeId: note', 'recordId: one', 'fields: {}', '---', `See [[gdblob:sha256-${digest}]].`].join('\n')],
    [blobPath, blobBytes]
  ]);

  const roundTripped = exportAndLoad(snapshot);
  const paths = [...roundTripped.files.keys()];
  assert.ok(paths.includes(blobPath));
  assert.ok(paths.includes('types/note.md'));
  assert.ok(paths.includes('records/note.one/one.md'));
});

test('GC-002: export excludes unreferenced blobs', () => {
  const blobBytes = encoder.encode('flower');
  const digest = hash(blobBytes);
  const blobPath = `blobs/sha256/${digest.slice(0, 2)}/${digest}`;

  const snapshot = makeSnapshot([
    ['types/note.md', ['---', 'typeId: note', 'fields: {}', '---', ''].join('\n')],
    ['records/note-1.md', ['---', 'typeId: note', 'recordId: one', 'fields: {}', '---', `See [[gdblob:sha256-${digest}]].`].join('\n')],
    [blobPath, blobBytes],
    ['blobs/sha256/aa/aa' + '0'.repeat(62), encoder.encode('garbage blob')]
  ]);

  const roundTripped = exportAndLoad(snapshot);
  const paths = [...roundTripped.files.keys()];
  assert.ok(!paths.includes('blobs/sha256/aa/aa' + '0'.repeat(62)));
});

test('EXP-003: canonical dataset export round-trips bytes and graph', () => {
  const snapshot = makeSnapshot([
    ['types/note.md', ['---', 'typeId: note', 'fields: {}', '---', ''].join('\n')],
    ['records/note.one/one.md', ['---', 'typeId: note', 'recordId: one', 'fields: {}', '---', 'Body'].join('\n')]
  ]);

  const roundTripped = exportAndLoad(snapshot);
  const graph = buildGraphFromSnapshot(roundTripped);
  assert.equal(graph.ok, true, JSON.stringify(graph.errors));
  assert.deepEqual(
    [...snapshot.files.keys()].sort(),
    [...roundTripped.files.keys()].sort()
  );
  for (const key of snapshot.files.keys()) {
    const original = snapshot.files.get(key);
    const roundTrip = roundTripped.files.get(key);
    assert.ok(original);
    assert.ok(roundTrip);
    assert.equal(Buffer.compare(Buffer.from(original), Buffer.from(roundTrip)), 0);
  }
});
