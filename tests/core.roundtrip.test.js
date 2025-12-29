const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  loadRepoSnapshotFromFs,
  buildGraphFromSnapshot,
  exportDatasetOnlyZip,
  exportWholeRepoZip,
  loadRepoSnapshotFromZipFile,
} = require('../dist/core');

const fixtureRoot = path.join(__dirname, 'fixtures', 'roundtrip-repo');

function serializeGraph(graph) {
  const nodeIds = [...graph.nodesById.keys()].sort((a, b) => a.localeCompare(b));
  const nodes = {};
  for (const id of nodeIds) {
    const node = graph.nodesById.get(id);
    nodes[id] = {
      file: node.file,
      kind: node.kind,
      typeId: node.typeId,
      datasetId: node.datasetId,
    };
  }

  const typeIds = [...graph.typesByRecordTypeId.keys()].sort((a, b) => a.localeCompare(b));
  const types = {};
  for (const id of typeIds) {
    const type = graph.typesByRecordTypeId.get(id);
    types[id] = {
      typeRecordId: type.typeRecordId,
      file: type.file,
    };
  }

  const idSet = new Set([
    ...nodeIds,
    ...graph.outgoing.keys(),
    ...graph.incoming.keys(),
  ]);
  const allIds = [...idSet].sort((a, b) => a.localeCompare(b));
  const outgoing = {};
  const incoming = {};
  for (const id of allIds) {
    outgoing[id] = graph.getLinksFrom(id);
    incoming[id] = graph.getLinksTo(id);
  }

  return {
    nodeIds,
    nodes,
    types,
    outgoing,
    incoming,
  };
}

function sortedKeys(map) {
  return [...map.keys()].sort((a, b) => a.localeCompare(b));
}

test('round-trips dataset-only zip exports', () => {
  const snapshot1 = loadRepoSnapshotFromFs(fixtureRoot);
  const result1 = buildGraphFromSnapshot(snapshot1);
  assert.equal(result1.ok, true);

  const zipBytes = exportDatasetOnlyZip(snapshot1);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graphdown-roundtrip-'));
  const zipPath = path.join(tempDir, 'dataset-only.zip');

  try {
    fs.writeFileSync(zipPath, Buffer.from(zipBytes));
    const snapshot2 = loadRepoSnapshotFromZipFile(zipPath);
    assert.equal(snapshot2.files.has('assets/info.txt'), false);

    const result2 = buildGraphFromSnapshot(snapshot2);
    assert.equal(result2.ok, true);
    assert.deepEqual(serializeGraph(result1.graph), serializeGraph(result2.graph));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('round-trips whole-repo zip exports', () => {
  const snapshot1 = loadRepoSnapshotFromFs(fixtureRoot);
  const result1 = buildGraphFromSnapshot(snapshot1);
  assert.equal(result1.ok, true);

  const zipBytes = exportWholeRepoZip(snapshot1);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graphdown-roundtrip-'));
  const zipPath = path.join(tempDir, 'whole-repo.zip');

  try {
    fs.writeFileSync(zipPath, Buffer.from(zipBytes));
    const snapshot2 = loadRepoSnapshotFromZipFile(zipPath);
    const keys1 = sortedKeys(snapshot1.files);
    const keys2 = sortedKeys(snapshot2.files);
    assert.deepEqual(keys1, keys2);
    for (const filePath of keys1) {
      const original = snapshot1.files.get(filePath);
      const roundTripped = snapshot2.files.get(filePath);
      assert.ok(original);
      assert.ok(roundTripped);
      assert.equal(Buffer.compare(Buffer.from(original), Buffer.from(roundTripped)), 0);
    }

    const result2 = buildGraphFromSnapshot(snapshot2);
    assert.equal(result2.ok, true);
    assert.deepEqual(serializeGraph(result1.graph), serializeGraph(result2.graph));

    const zipBytes2 = exportWholeRepoZip(snapshot2);
    const zipPath2 = path.join(tempDir, 'whole-repo-2.zip');
    fs.writeFileSync(zipPath2, Buffer.from(zipBytes2));
    const snapshot3 = loadRepoSnapshotFromZipFile(zipPath2);
    const result3 = buildGraphFromSnapshot(snapshot3);
    assert.equal(result3.ok, true);
    assert.deepEqual(serializeGraph(result2.graph), serializeGraph(result3.graph));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
