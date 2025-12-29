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
    if (!node) {
      continue;
    }
    nodes[id] = {
      file: node.file,
      kind: node.kind,
      typeId: node.typeId,
      datasetId: node.datasetId,
    };
  }

  const typeKeys = [...graph.typesByRecordTypeId.keys()].sort((a, b) => a.localeCompare(b));
  const types = {};
  for (const key of typeKeys) {
    const typeDef = graph.typesByRecordTypeId.get(key);
    if (!typeDef) {
      continue;
    }
    types[key] = {
      typeRecordId: typeDef.typeRecordId,
      file: typeDef.file,
    };
  }

  const idSet = new Set(nodeIds);
  for (const id of graph.outgoing.keys()) {
    idSet.add(id);
  }
  for (const id of graph.incoming.keys()) {
    idSet.add(id);
  }
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

function writeTempZip(bytes) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graphdown-roundtrip-'));
  const zipPath = path.join(tempDir, 'snapshot.zip');
  fs.writeFileSync(zipPath, Buffer.from(bytes));
  return { tempDir, zipPath };
}

test('round-trips dataset-only zip exports', () => {
  const snapshot1 = loadRepoSnapshotFromFs(fixtureRoot);
  const result1 = buildGraphFromSnapshot(snapshot1);
  assert.equal(result1.ok, true);

  const zipBytes = exportDatasetOnlyZip(snapshot1);
  const { tempDir, zipPath } = writeTempZip(zipBytes);

  try {
    const snapshot2 = loadRepoSnapshotFromZipFile(zipPath);
    const result2 = buildGraphFromSnapshot(snapshot2);
    assert.equal(result2.ok, true);

    assert.deepEqual(serializeGraph(result1.graph), serializeGraph(result2.graph));
    assert.equal(snapshot2.files.has('assets/info.txt'), false);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('round-trips whole-repo zip exports', () => {
  const snapshot1 = loadRepoSnapshotFromFs(fixtureRoot);
  const result1 = buildGraphFromSnapshot(snapshot1);
  assert.equal(result1.ok, true);

  const zipBytes = exportWholeRepoZip(snapshot1);
  const { tempDir, zipPath } = writeTempZip(zipBytes);

  try {
    const snapshot2 = loadRepoSnapshotFromZipFile(zipPath);
    const result2 = buildGraphFromSnapshot(snapshot2);
    assert.equal(result2.ok, true);

    assert.deepEqual(sortedKeys(snapshot1.files), sortedKeys(snapshot2.files));
    for (const key of snapshot1.files.keys()) {
      const original = snapshot1.files.get(key);
      const next = snapshot2.files.get(key);
      assert.ok(original);
      assert.ok(next);
      assert.equal(Buffer.compare(Buffer.from(original), Buffer.from(next)), 0);
    }

    assert.deepEqual(serializeGraph(result1.graph), serializeGraph(result2.graph));

    const zipBytes2 = exportWholeRepoZip(snapshot2);
    const { tempDir: tempDir2, zipPath: zipPath2 } = writeTempZip(zipBytes2);
    try {
      const snapshot3 = loadRepoSnapshotFromZipFile(zipPath2);
      const result3 = buildGraphFromSnapshot(snapshot3);
      assert.equal(result3.ok, true);
      assert.deepEqual(serializeGraph(result2.graph), serializeGraph(result3.graph));
    } finally {
      fs.rmSync(tempDir2, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
