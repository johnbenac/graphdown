const assert = require('node:assert/strict');
const test = require('node:test');

const { validateDatasetSnapshot } = require('../dist/core');

function makeSnapshot(files) {
  return { files: new Map(files) };
}

function asBytes(value) {
  return Buffer.from(value, 'utf8');
}

test('rejects nested dataset manifests', () => {
  const snapshot = makeSnapshot([
    ['datasets/nested/dataset--demo.md', asBytes('---\nid: dataset:demo\n---')],
    ['types/type--note.md', asBytes('---\nid: type:note\n---')],
    ['records/note/record--1.md', asBytes('---\nid: record:1\n---')]
  ]);

  const result = validateDatasetSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.equal(result.errors[0].code, 'E_DATASET_FILE_LOCATION');
  assert.match(result.errors[0].message, /datasets\/nested\/dataset--demo\.md/);
});

test('lists all dataset manifests when multiple are found', () => {
  const snapshot = makeSnapshot([
    ['datasets/dataset--one.md', asBytes('---\nid: dataset:one\n---')],
    ['datasets/nested/dataset--two.md', asBytes('---\nid: dataset:two\n---')],
    ['types/type--note.md', asBytes('---\nid: type:note\n---')],
    ['records/note/record--1.md', asBytes('---\nid: record:1\n---')]
  ]);

  const result = validateDatasetSnapshot(snapshot);

  assert.equal(result.ok, false);
  assert.equal(result.errors[0].code, 'E_DATASET_FILE_COUNT');
  assert.match(result.errors[0].message, /datasets\/dataset--one\.md/);
  assert.match(result.errors[0].message, /datasets\/nested\/dataset--two\.md/);
});
