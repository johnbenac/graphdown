const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  buildGraphFromSnapshot,
  exportDatasetOnlyZip,
  exportWholeRepoZip,
  loadRepoSnapshotFromFs,
  loadRepoSnapshotFromZipFile
} = require('../dist/core');

const fixtureRoot = path.join(__dirname, 'fixtures', 'roundtrip-repo');

function sortedKeys(map) {
  return [...map.keys()].sort((a, b) => a.localeCompare(b));
}

function serializeGraph(graph) {
  const nodeIds = sortedKeys(graph.nodesById);
  const nodes = {};
  for (const id of nodeIds) {
    const node = graph.nodesById.get(id);
    nodes[id] = {
      file: node.file,
      kind: node.kind,
      typeId: node.typeId
    };
  }

  const typeIds = sortedKeys(graph.typesByRecordTypeId);
  const types = {};
  for (const id of typeIds) {
    const typeDef = graph.typesByRecordTypeId.get(id);
    types[id] = {
      typeRecordId: typeDef.typeRecordId,
      file: typeDef.file
    };
  }

  const ids = new Set(nodeIds);
  for (const id of graph.outgoing.keys()) {
    ids.add(id);
  }
  for (const id of graph.incoming.keys()) {
    ids.add(id);
  }

  const orderedIds = [...ids].sort((a, b) => a.localeCompare(b));
  const outgoing = {};
  const incoming = {};
  for (const id of orderedIds) {
    outgoing[id] = graph.getLinksFrom(id);
    incoming[id] = graph.getLinksTo(id);
  }

  return { nodeIds, nodes, types, outgoing, incoming };
}

function buildGraph(snapshot) {
  const result = buildGraphFromSnapshot(snapshot);
  assert.equal(result.ok, true);
  return result.graph;
}

function writeTempZip(zipBytes) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graphdown-zip-'));
  const zipPath = path.join(tempDir, 'snapshot.zip');
  fs.writeFileSync(zipPath, Buffer.from(zipBytes));
  return { tempDir, zipPath };
}

test('EXP-002: record-only zip export/import round-trips', () => {
  const snapshot1 = loadRepoSnapshotFromFs(fixtureRoot);
  const graph1 = buildGraph(snapshot1);

  const zipBytes = exportDatasetOnlyZip(snapshot1);
  const { tempDir, zipPath } = writeTempZip(zipBytes);

  try {
    const snapshot2 = loadRepoSnapshotFromZipFile(zipPath);
    const graph2 = buildGraph(snapshot2);

    assert.deepEqual(serializeGraph(graph1), serializeGraph(graph2));
    assert.equal(snapshot2.files.has('assets/info.txt'), false);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('EXP-005: whole-repo zip export preserves content bytes', () => {
  const snapshot1 = loadRepoSnapshotFromFs(fixtureRoot);
  const graph1 = buildGraph(snapshot1);

  const zipBytes = exportWholeRepoZip(snapshot1);
  const { tempDir, zipPath } = writeTempZip(zipBytes);

  try {
    const snapshot2 = loadRepoSnapshotFromZipFile(zipPath);
    const graph2 = buildGraph(snapshot2);

    assert.deepEqual(sortedKeys(snapshot1.files), sortedKeys(snapshot2.files));
    for (const filePath of snapshot1.files.keys()) {
      const original = snapshot1.files.get(filePath);
      const roundTrip = snapshot2.files.get(filePath);
      assert.ok(original);
      assert.ok(roundTrip);
      const compare = Buffer.compare(Buffer.from(original), Buffer.from(roundTrip));
      assert.equal(compare, 0);
    }

    assert.deepEqual(serializeGraph(graph1), serializeGraph(graph2));

    const zipBytesAgain = exportWholeRepoZip(snapshot2);
    const { tempDir: tempDir2, zipPath: zipPath2 } = writeTempZip(zipBytesAgain);
    try {
      const snapshot3 = loadRepoSnapshotFromZipFile(zipPath2);
      const graph3 = buildGraph(snapshot3);
      assert.deepEqual(serializeGraph(graph2), serializeGraph(graph3));
    } finally {
      fs.rmSync(tempDir2, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
