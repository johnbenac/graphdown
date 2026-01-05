const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { validateDatasetSnapshot } = require('../dist/core');

function loadDatasetSnapshotFromFs(root) {
  const files = new Map();

  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === '.git') {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const relPath = path.relative(root, fullPath).split(path.sep).join('/');
        const contents = fs.readFileSync(fullPath);
        files.set(relPath, contents);
      }
    }
  };

  walk(root);
  return { files };
}

test('ERR-001: validation errors expose stable fields', () => {
  const snapshot = loadDatasetSnapshotFromFs(path.join(__dirname, 'fixtures', 'invalid-dataset'));

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
