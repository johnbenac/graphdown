const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const { loadRepoSnapshotFromFs, validateDatasetSnapshot } = require('../dist/core');

test('ERR-001: validation errors expose stable fields', () => {
  const snapshot = loadRepoSnapshotFromFs(path.join(__dirname, 'fixtures', 'invalid-dataset'));

  const result = validateDatasetSnapshot(snapshot);
  assert.equal(result.ok, false);
  assert.ok(Array.isArray(result.errors));
  assert.ok(result.errors.length > 0);
  for (const error of result.errors) {
    assert.equal(typeof error.code, 'string');
    assert.equal(typeof error.message, 'string');
    assert.ok(Object.hasOwn(error, 'file'));
    assert.ok(Object.hasOwn(error, 'hint'));
  }
});
