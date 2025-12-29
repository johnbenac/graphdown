const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');

const cliPath = path.join(process.cwd(), 'dist', 'cli.js');

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    encoding: 'utf8',
  });
}

test('cli delegates to validator for invalid path', () => {
  assert.ok(
    cliPath && cliPath.length > 0,
    'CLI path should be defined'
  );

  const missingPath = path.join(process.cwd(), 'tests', 'fixtures', 'missing');
  const result = runCli([missingPath]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /does not exist or is not a directory/);
});
