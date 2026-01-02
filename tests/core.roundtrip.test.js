const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createHash } = require('node:crypto');

const {
  buildGraphFromSnapshot,
  exportDatasetOnlyZip,
  exportWholeRepoZip,
  loadRepoSnapshotFromZipFile,
  loadRepoSnapshotFromZipBytes
} = require('../dist/core');

const encoder = new TextEncoder();

function makeSnapshot(entries) {
  return { files: new Map(entries.map(([p, c]) => [p, typeof c === 'string' ? encoder.encode(c) : c])) };
}

function writeTempZip(zipBytes) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graphdown-zip-'));
  const zipPath = path.join(tempDir, 'snapshot.zip');
  fs.writeFileSync(zipPath, Buffer.from(zipBytes));
  return { tempDir, zipPath };
}

function serializeGraph(graph) {
  const types = [...graph.typesById.keys()].sort();
  const records = [...graph.recordsByKey.keys()].sort();
  const outgoing = {};
  const incoming = {};
  for (const id of records) {
    outgoing[id] = graph.getLinksFrom(id);
    incoming[id] = graph.getLinksTo(id);
  }
  return { types, records, outgoing, incoming };
}

function hash(content) {
  return createHash('sha256').update(content).digest('hex');
}

test('EXP-002/EXP-006: record-only export includes type/records and reachable blobs, excludes garbage', () => {
  const blobBytes = encoder.encode('flower');
  const digest = hash(blobBytes);
  const blobPath = `blobs/sha256/${digest.slice(0, 2)}/${digest}`;

  const snapshot = makeSnapshot([
    ['types/note.md', ['---', 'typeId: note', 'fields: {}', '---', ''].join('\n')],
    ['records/note-1.md', ['---', 'typeId: note', 'recordId: one', 'fields: {}', '---', `See [[gdblob:sha256-${digest}]].`].join('\n')],
    [blobPath, blobBytes],
    ['assets/info.txt', 'not part of dataset'],
    ['blobs/sha256/aa/aa' + '0'.repeat(62), encoder.encode('garbage blob')]
  ]);

  const graph = buildGraphFromSnapshot(snapshot);
  assert.equal(graph.ok, true, JSON.stringify(graph.errors));

  const zipBytes = exportDatasetOnlyZip(snapshot);
  const { tempDir, zipPath } = writeTempZip(zipBytes);
  try {
    const roundTripped = loadRepoSnapshotFromZipFile(zipPath);
    const graph2 = buildGraphFromSnapshot(roundTripped);
    assert.equal(graph2.ok, true, JSON.stringify(graph2.errors));
    assert.deepEqual(serializeGraph(graph.graph), serializeGraph(graph2.graph));

    const paths = [...roundTripped.files.keys()];
    assert.ok(paths.includes(blobPath));
    assert.ok(!paths.includes('assets/info.txt'));
    assert.ok(!paths.includes('blobs/sha256/aa/aa' + '0'.repeat(62)));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('EXP-003/EXP-004/EXP-005: whole-repo export round-trips all files and bytes', () => {
  const snapshot = makeSnapshot([
    ['types/note.md', ['---', 'typeId: note', 'fields: {}', '---', ''].join('\n')],
    ['records/note-1.md', ['---', 'typeId: note', 'recordId: one', 'fields: {}', '---', 'Body'].join('\n')],
    ['docs/readme.md', '# docs\n']
  ]);

  const zipBytes = exportWholeRepoZip(snapshot);
  const { tempDir, zipPath } = writeTempZip(zipBytes);
  try {
    const roundTripped = loadRepoSnapshotFromZipFile(zipPath);
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

    // Re-export stays stable
    const zipAgain = exportWholeRepoZip(roundTripped);
    const roundTrippedAgain = loadRepoSnapshotFromZipBytes(zipAgain);
    const graphAgain = buildGraphFromSnapshot(roundTrippedAgain);
    assert.equal(graphAgain.ok, true, JSON.stringify(graphAgain.errors));
    assert.deepEqual(serializeGraph(graph.graph), serializeGraph(graphAgain.graph));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
