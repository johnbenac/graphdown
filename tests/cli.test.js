const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const rootDir = path.resolve(__dirname, '..');
const cliPath = path.join(rootDir, 'dist', 'cli.js');

test('cli prints usage when invoked without arguments', () => {
  const result = spawnSync(process.execPath, [cliPath], { encoding: 'utf8' });

  assert.notEqual(result.status, 0);

  const output = `${result.stdout}${result.stderr}`;
  assert.match(output, /Usage:/);
});

test('cli fails when required dataset directories are missing', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graphdown-'));
  const result = spawnSync(
    process.execPath,
    [cliPath, 'validate', tempDir],
    { encoding: 'utf8' },
  );

  assert.notEqual(result.status, 0);

  const output = `${result.stdout}${result.stderr}`;
  assert.match(output, /Missing required `datasets\/` directory/);
});
