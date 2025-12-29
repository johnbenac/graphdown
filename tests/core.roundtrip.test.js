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
  loadRepoSnapshotFromZipFile
} = require('../dist/core');

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
      datasetId: node.datasetId
    };
  }

  const types = {};
  const typeIds = [...graph.typesByRecordTypeId.keys()].sort((a, b) => a.localeCompare(b));
  for (const id of typeIds) {
    const typeDef = graph.typesByRecordTypeId.get(id);
    if (!typeDef) {
      continue;
    }
    types[id] = {
      typeRecordId: typeDef.typeRecordId,
      file: typeDef.file
    };
  }

  const idSet = new Set(nodeIds);
  for (const id of graph.outgoing.keys()) {
    idSet.add(id);
  }
  for (const id of graph.incoming.keys()) {
    idSet.add(id);
  }
  const linkIds = [...idSet].sort((a, b) => a.localeCompare(b));
  const outgoing = {};
  const incoming = {};
  for (const id of linkIds) {
    outgoing[id] = graph.getLinksFrom(id);
    incoming[id] = graph.getLinksTo(id);
  }

  return {
    nodeIds,
    nodes,
    types,
    outgoing,
    incoming
  };
}

function sortedKeys(map) {
  return [...map.keys()].sort((a, b) => a.localeCompare(b));
}

const fixtureRoot = path.join(__dirname, 'fixtures', 'roundtrip-repo');

test('dataset-only zip round-trip preserves graph semantics', () => {
  const snapshot1 = loadRepoSnapshotFromFs(fixtureRoot);
  const result1 = buildGraphFromSnapshot(snapshot1);
  assert.equal(result1.ok, true);
  const graph1 = result1.graph;

  const zipBytes = exportDatasetOnlyZip(snapshot1);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graphdown-roundtrip-'));
  const zipPath = path.join(tempDir, 'dataset-only.zip');
  fs.writeFileSync(zipPath, Buffer.from(zipBytes));

  try {
    const snapshot2 = loadRepoSnapshotFromZipFile(zipPath);
    assert.equal(snapshot2.files.has('assets/info.txt'), false);

    const result2 = buildGraphFromSnapshot(snapshot2);
    assert.equal(result2.ok, true);

    assert.deepEqual(serializeGraph(graph1), serializeGraph(result2.graph));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('whole-repo zip round-trip preserves bytes and graph semantics', () => {
  const snapshot1 = loadRepoSnapshotFromFs(fixtureRoot);
  const result1 = buildGraphFromSnapshot(snapshot1);
  assert.equal(result1.ok, true);
  const graph1 = result1.graph;

  const zipBytes = exportWholeRepoZip(snapshot1);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graphdown-roundtrip-'));
  const zipPath = path.join(tempDir, 'whole-repo.zip');
  fs.writeFileSync(zipPath, Buffer.from(zipBytes));

  try {
    const snapshot2 = loadRepoSnapshotFromZipFile(zipPath);
    const paths1 = sortedKeys(snapshot1.files);
    const paths2 = sortedKeys(snapshot2.files);
    assert.deepEqual(paths1, paths2);
    for (const filePath of paths1) {
      const original = snapshot1.files.get(filePath);
      const roundtrip = snapshot2.files.get(filePath);
      assert.ok(original);
      assert.ok(roundtrip);
      assert.equal(Buffer.compare(Buffer.from(original), Buffer.from(roundtrip)), 0);
    }

    const result2 = buildGraphFromSnapshot(snapshot2);
    assert.equal(result2.ok, true);
    assert.deepEqual(serializeGraph(graph1), serializeGraph(result2.graph));

    const zipBytes2 = exportWholeRepoZip(snapshot2);
    const zipPath2 = path.join(tempDir, 'whole-repo-2.zip');
    fs.writeFileSync(zipPath2, Buffer.from(zipBytes2));

    const snapshot3 = loadRepoSnapshotFromZipFile(zipPath2);
    const paths3 = sortedKeys(snapshot3.files);
    assert.deepEqual(paths2, paths3);
    for (const filePath of paths2) {
      const second = snapshot2.files.get(filePath);
      const third = snapshot3.files.get(filePath);
      assert.ok(second);
      assert.ok(third);
      assert.equal(Buffer.compare(Buffer.from(second), Buffer.from(third)), 0);
    }

    const result3 = buildGraphFromSnapshot(snapshot3);
    assert.equal(result3.ok, true);
    assert.deepEqual(serializeGraph(result2.graph), serializeGraph(result3.graph));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
