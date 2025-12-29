const assert = require('node:assert/strict');
const test = require('node:test');

const { validateDatasetSnapshot } = require('../dist/core');

const encoder = new TextEncoder();

function makeSnapshot(files) {
  const map = new Map();
  for (const [path, contents] of Object.entries(files)) {
    map.set(path, encoder.encode(contents));
  }
  return { files: map };
}

function baseDatasetFiles() {
  return {
    'datasets/dataset--demo.md': `---
id: "dataset:demo"
datasetId: "dataset:demo"
typeId: "sys:dataset"
createdAt: "2024-01-01T00:00:00Z"
updatedAt: "2024-01-01T00:00:00Z"
fields:
  name: "Demo Dataset"
  description: "Test dataset."
---`,
    'types/type--note.md': `---
id: "type:note"
datasetId: "dataset:demo"
typeId: "sys:type"
createdAt: "2024-01-01T00:00:00Z"
updatedAt: "2024-01-01T00:00:00Z"
fields:
  recordTypeId: "note"
---`,
    'records/note/record--1.md': `---
id: "note:1"
datasetId: "dataset:demo"
typeId: "note"
createdAt: "2024-01-01T00:00:00Z"
updatedAt: "2024-01-01T00:00:00Z"
fields:
  title: "Hello"
---`
  };
}

test('flags missing directories', () => {
  const snapshot = makeSnapshot({});
  const result = validateDatasetSnapshot(snapshot);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === 'E_DIR_MISSING'));
});

test('flags dataset file count issues', () => {
  const files = baseDatasetFiles();
  files['datasets/extra.md'] = files['datasets/dataset--demo.md'];
  const snapshot = makeSnapshot(files);
  const result = validateDatasetSnapshot(snapshot);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === 'E_DATASET_FILE_COUNT'));
});

test('flags missing front matter', () => {
  const files = baseDatasetFiles();
  files['datasets/dataset--demo.md'] = 'no front matter';
  const snapshot = makeSnapshot(files);
  const result = validateDatasetSnapshot(snapshot);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === 'E_FRONT_MATTER_MISSING'));
});

test('flags invalid YAML', () => {
  const files = baseDatasetFiles();
  files['datasets/dataset--demo.md'] = `---
id: "dataset:demo"
datasetId: "dataset:demo"
typeId: "sys:dataset"
fields: [oops
---`;
  const snapshot = makeSnapshot(files);
  const result = validateDatasetSnapshot(snapshot);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === 'E_YAML_INVALID'));
});

test('flags invalid dataset id prefix', () => {
  const files = baseDatasetFiles();
  files['datasets/dataset--demo.md'] = files['datasets/dataset--demo.md'].replace(
    'id: "dataset:demo"',
    'id: "demo"'
  );
  const snapshot = makeSnapshot(files);
  const result = validateDatasetSnapshot(snapshot);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === 'E_ID_PREFIX_INVALID'));
});

test('flags missing dataset fields', () => {
  const files = baseDatasetFiles();
  files['datasets/dataset--demo.md'] = files['datasets/dataset--demo.md'].replace(
    'description: "Test dataset."',
    'description: ""'
  );
  const snapshot = makeSnapshot(files);
  const result = validateDatasetSnapshot(snapshot);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === 'E_DATASET_FIELDS_MISSING'));
});

test('flags unknown record directories', () => {
  const files = baseDatasetFiles();
  files['records/unknown/record--1.md'] = files['records/note/record--1.md'];
  const snapshot = makeSnapshot(files);
  const result = validateDatasetSnapshot(snapshot);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === 'E_UNKNOWN_RECORD_DIR'));
});

test('flags record type mismatch', () => {
  const files = baseDatasetFiles();
  files['records/note/record--1.md'] = files['records/note/record--1.md'].replace(
    'typeId: "note"',
    'typeId: "wrong"'
  );
  const snapshot = makeSnapshot(files);
  const result = validateDatasetSnapshot(snapshot);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === 'E_TYPEID_MISMATCH'));
});

test('flags duplicate ids', () => {
  const files = baseDatasetFiles();
  files['records/note/record--1.md'] = files['records/note/record--1.md'].replace(
    'id: "note:1"',
    'id: "dataset:demo"'
  );
  const snapshot = makeSnapshot(files);
  const result = validateDatasetSnapshot(snapshot);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === 'E_DUPLICATE_ID'));
});
