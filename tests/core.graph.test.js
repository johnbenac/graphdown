const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { buildGraphFromFs } = require('../dist/core');

const fixturePath = path.join(__dirname, 'fixtures', 'graph-dataset');

function buildFixtureGraph() {
  const result = buildGraphFromFs(fixturePath);
  assert.equal(result.ok, true);
  return result.graph;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFile(filePath, contents) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, contents, 'utf8');
}

function createTempDataset({ typeRecordTypeId = 'note', recordIds = ['note:1'] }) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graphdown-graph-'));
  writeFile(
    path.join(tmpDir, 'datasets', 'dataset--demo.md'),
    `---\n` +
      `id: "dataset:demo"\n` +
      `datasetId: "dataset:demo"\n` +
      `typeId: "sys:dataset"\n` +
      `createdAt: "2024-01-01T00:00:00Z"\n` +
      `updatedAt: "2024-01-01T00:00:00Z"\n` +
      `fields:\n` +
      `  name: "Demo Dataset"\n` +
      `  description: "Temp dataset."\n` +
      `---\n\n`
  );
  writeFile(
    path.join(tmpDir, 'types', 'type--note.md'),
    `---\n` +
      `id: "type:note"\n` +
      `datasetId: "dataset:demo"\n` +
      `typeId: "sys:type"\n` +
      `createdAt: "2024-01-01T00:00:00Z"\n` +
      `updatedAt: "2024-01-01T00:00:00Z"\n` +
      `fields:\n` +
      `  recordTypeId: "${typeRecordTypeId}"\n` +
      `  name: "Note"\n` +
      `---\n\n`
  );
  recordIds.forEach((id, index) => {
    writeFile(
      path.join(tmpDir, 'records', 'note', `record--${index + 1}.md`),
      `---\n` +
        `id: "${id}"\n` +
        `datasetId: "dataset:demo"\n` +
        `typeId: "note"\n` +
        `createdAt: "2024-01-01T00:00:00Z"\n` +
        `updatedAt: "2024-01-01T00:00:00Z"\n` +
        `fields:\n` +
        `  title: "Note ${index + 1}"\n` +
        `---\n\n`
    );
  });
  return tmpDir;
}

test('buildGraphFromFs builds graph and answers outgoing links', () => {
  const graph = buildFixtureGraph();
  assert.deepEqual(graph.getLinksFrom('note:1'), ['note:2']);
  assert.deepEqual(graph.getLinksFrom('note:2'), ['note:1']);
});

test('buildGraphFromFs answers incoming links', () => {
  const graph = buildFixtureGraph();
  assert.deepEqual(graph.getLinksTo('note:1'), ['note:2']);
  assert.deepEqual(graph.getLinksTo('note:2'), ['note:1']);
});

test('buildGraphFromFs resolves type for record', () => {
  const graph = buildFixtureGraph();
  assert.equal(graph.getRecordTypeId('note:1'), 'note');
  const typeDef = graph.getTypeForRecord('note:1');
  assert.ok(typeDef);
  assert.equal(typeDef.recordTypeId, 'note');
});

test('buildGraphFromFs enforces global unique IDs', () => {
  const tmpDir = createTempDataset({ recordIds: ['note:1', 'note:1'] });
  const result = buildGraphFromFs(tmpDir);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === 'E_DUPLICATE_ID'));
});

test('buildGraphFromFs enforces stable recordTypeId format', () => {
  const tmpDir = createTempDataset({ typeRecordTypeId: 'Note Type' });
  const result = buildGraphFromFs(tmpDir);
  assert.equal(result.ok, false);
  assert.ok(
    result.errors.some((error) => error.code === 'E_RECORD_TYPE_ID_INVALID')
  );
});
