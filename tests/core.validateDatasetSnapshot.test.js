const assert = require('node:assert/strict');
const test = require('node:test');

const { validateDatasetSnapshot } = require('../dist/core');

const encoder = new TextEncoder();

function snapshotFromFiles(files) {
  const map = new Map();
  for (const [path, contents] of Object.entries(files)) {
    map.set(path, encoder.encode(contents));
  }
  return { files: map };
}

function createValidFiles(overrides = {}) {
  const dataset = `---
id: "dataset:demo"
datasetId: "dataset:demo"
typeId: "sys:dataset"
createdAt: "2024-01-01T00:00:00Z"
updatedAt: "2024-01-01T00:00:00Z"
fields:
  name: "Demo"
  description: "Demo dataset"
---
`;

  const type = `---
id: "type:note"
datasetId: "dataset:demo"
typeId: "sys:type"
createdAt: "2024-01-01T00:00:00Z"
updatedAt: "2024-01-01T00:00:00Z"
fields:
  recordTypeId: "note"
---
`;

  const record = `---
id: "note:1"
datasetId: "dataset:demo"
typeId: "note"
createdAt: "2024-01-01T00:00:00Z"
updatedAt: "2024-01-01T00:00:00Z"
fields:
  title: "Note 1"
---
`;

  return {
    'datasets/dataset--demo.md': dataset,
    'types/type--note.md': type,
    'records/note/record--1.md': record,
    ...overrides
  };
}

test('reports missing directories', () => {
  const snapshot = snapshotFromFiles({});
  const result = validateDatasetSnapshot(snapshot);
  assert.equal(result.ok, false);
  assert.ok(result.errors.find((error) => error.code === 'E_DIR_MISSING'));
});

test('reports dataset file count issues', () => {
  const snapshot = snapshotFromFiles({
    'datasets/one.md': createValidFiles()['datasets/dataset--demo.md'],
    'datasets/two.md': createValidFiles()['datasets/dataset--demo.md'],
    'types/type--note.md': createValidFiles()['types/type--note.md'],
    'records/note/record--1.md': createValidFiles()['records/note/record--1.md']
  });
  const result = validateDatasetSnapshot(snapshot);
  assert.equal(result.ok, false);
  assert.ok(result.errors.find((error) => error.code === 'E_DATASET_FILE_COUNT'));
});

test('reports missing front matter', () => {
  const snapshot = snapshotFromFiles(
    createValidFiles({ 'datasets/dataset--demo.md': 'no front matter' })
  );
  const result = validateDatasetSnapshot(snapshot);
  assert.equal(result.ok, false);
  assert.ok(result.errors.find((error) => error.code === 'E_FRONT_MATTER_MISSING'));
});

test('reports invalid yaml', () => {
  const snapshot = snapshotFromFiles(
    createValidFiles({ 'datasets/dataset--demo.md': '---\nid: [\n---' })
  );
  const result = validateDatasetSnapshot(snapshot);
  assert.equal(result.ok, false);
  assert.ok(result.errors.find((error) => error.code === 'E_YAML_INVALID'));
});

test('reports dataset id prefix issues', () => {
  const snapshot = snapshotFromFiles(
    createValidFiles({
      'datasets/dataset--demo.md': `---\nid: "demo"\ndatasetId: "demo"\ntypeId: "sys:dataset"\ncreatedAt: "2024-01-01T00:00:00Z"\nupdatedAt: "2024-01-01T00:00:00Z"\nfields:\n  name: "Demo"\n  description: "Demo"\n---\n`
    })
  );
  const result = validateDatasetSnapshot(snapshot);
  assert.equal(result.ok, false);
  assert.ok(result.errors.find((error) => error.code === 'E_ID_PREFIX_INVALID'));
});

test('reports missing dataset fields', () => {
  const snapshot = snapshotFromFiles(
    createValidFiles({
      'datasets/dataset--demo.md': `---\nid: "dataset:demo"\ndatasetId: "dataset:demo"\ntypeId: "sys:dataset"\ncreatedAt: "2024-01-01T00:00:00Z"\nupdatedAt: "2024-01-01T00:00:00Z"\nfields:\n  name: ""\n---\n`
    })
  );
  const result = validateDatasetSnapshot(snapshot);
  assert.equal(result.ok, false);
  assert.ok(result.errors.find((error) => error.code === 'E_DATASET_FIELDS_MISSING'));
});

test('reports unknown record directories', () => {
  const snapshot = snapshotFromFiles(
    createValidFiles({
      'records/task/record--1.md': createValidFiles()['records/note/record--1.md']
    })
  );
  const result = validateDatasetSnapshot(snapshot);
  assert.equal(result.ok, false);
  assert.ok(result.errors.find((error) => error.code === 'E_UNKNOWN_RECORD_DIR'));
});

test('reports record type mismatch', () => {
  const snapshot = snapshotFromFiles(
    createValidFiles({
      'records/note/record--1.md': `---\nid: "note:1"\ndatasetId: "dataset:demo"\ntypeId: "task"\ncreatedAt: "2024-01-01T00:00:00Z"\nupdatedAt: "2024-01-01T00:00:00Z"\nfields:\n  title: "Note 1"\n---\n`
    })
  );
  const result = validateDatasetSnapshot(snapshot);
  assert.equal(result.ok, false);
  assert.ok(result.errors.find((error) => error.code === 'E_TYPEID_MISMATCH'));
});

test('reports duplicate ids', () => {
  const snapshot = snapshotFromFiles(
    createValidFiles({
      'types/type--note.md': `---\nid: "dataset:demo"\ndatasetId: "dataset:demo"\ntypeId: "sys:type"\ncreatedAt: "2024-01-01T00:00:00Z"\nupdatedAt: "2024-01-01T00:00:00Z"\nfields:\n  recordTypeId: "note"\n---\n`
    })
  );
  const result = validateDatasetSnapshot(snapshot);
  assert.equal(result.ok, false);
  assert.ok(result.errors.find((error) => error.code === 'E_DUPLICATE_ID'));
});
