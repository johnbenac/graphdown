const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const cliPath = path.resolve(__dirname, '..', 'dist', 'cli.js');

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    encoding: 'utf-8',
  });
}

test('CLI prints usage and exits non-zero with no args', () => {
  const result = runCli([]);
  const output = `${result.stdout}${result.stderr}`;
  assert.notStrictEqual(result.status, 0);
  assert.match(output, /Usage: graphdown/);
});

test('CLI fails on empty dataset folder with missing directories error', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graphdown-'));
  const result = runCli([tempDir]);
  const output = `${result.stdout}${result.stderr}`;
  assert.notStrictEqual(result.status, 0);
  assert.match(output, /Missing required `datasets\/` directory/);
});
