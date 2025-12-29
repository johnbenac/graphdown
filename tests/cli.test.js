const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

test('CLI validates a known-good dataset fixture', () => {
  const datasetPath = path.resolve(__dirname, 'fixtures', 'valid-dataset');
  const cliPath = path.resolve(__dirname, '..', 'dist', 'cli.js');

  const result = spawnSync('node', [cliPath, datasetPath], {
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Validation passed: dataset is valid\./);
});
