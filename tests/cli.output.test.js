const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const cliPath = path.join(__dirname, '..', 'dist', 'cli.js');
const validFixture = path.join(__dirname, 'fixtures', 'valid-dataset');
const invalidFixture = path.join(__dirname, 'fixtures', 'invalid-dataset');

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, 'validate', ...args], { encoding: 'utf8' });
}

test('json output reports success for valid dataset', () => {
  const result = runCli([validFixture, '--json']);

  assert.equal(result.status, 0);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.errors, []);
});

test('json output reports structured errors for invalid dataset', () => {
  const result = runCli([invalidFixture, '--json']);

  assert.equal(result.status, 1);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.ok, false);
  assert.ok(parsed.errors.length > 0);
  for (const error of parsed.errors) {
    assert.ok(Object.prototype.hasOwnProperty.call(error, 'code'));
    assert.ok(Object.prototype.hasOwnProperty.call(error, 'message'));
    assert.ok(Object.prototype.hasOwnProperty.call(error, 'file'));
    assert.ok(Object.prototype.hasOwnProperty.call(error, 'hint'));
  }
});

test('pretty output includes error codes', () => {
  const result = runCli([invalidFixture, '--pretty']);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Validation failed/);
  assert.match(result.stderr, /\[E_DIR_MISSING\]/);
});
