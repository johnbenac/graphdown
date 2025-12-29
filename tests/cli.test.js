const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const cliPath = path.resolve(__dirname, '..', 'dist', 'cli.js');

test('cli prints usage and exits non-zero when missing args', () => {
  const result = spawnSync(process.execPath, [cliPath], { encoding: 'utf8' });

  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /Usage:/);
});

test('cli forwards validation errors for missing dataset directories', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graphdown-'));
  const result = spawnSync(process.execPath, [cliPath, 'validate', tempDir], {
    encoding: 'utf8'
  });

  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /Missing required `datasets\/` directory/);
});
