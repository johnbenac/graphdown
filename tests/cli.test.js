const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const cliPath = path.join(__dirname, '..', 'dist', 'cli.js');

test('prints usage when no args are provided', () => {
  const result = spawnSync(process.execPath, [cliPath], { encoding: 'utf8' });

  assert.equal(result.status, 2);
  const output = `${result.stdout}${result.stderr}`;
  assert.match(output, /Usage:/);
});

test('fails when required dataset directories are missing', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graphdown-'));

  try {
    const result = spawnSync(process.execPath, [cliPath, 'validate', tempDir], {
      encoding: 'utf8'
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /\[E_DIR_MISSING\]/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
