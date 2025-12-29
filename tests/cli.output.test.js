const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const cliPath = path.join(__dirname, '..', 'dist', 'cli.js');
const fixturesPath = path.join(__dirname, 'fixtures');
const validDataset = path.join(fixturesPath, 'valid-dataset');
const invalidDataset = path.join(fixturesPath, 'invalid-dataset');

test('json output for valid dataset', () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, 'validate', validDataset, '--json'],
    { encoding: 'utf8' }
  );

  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.deepEqual(payload.errors, []);
});

test('json output for invalid dataset includes stable fields', () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, 'validate', invalidDataset, '--json'],
    { encoding: 'utf8' }
  );

  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.ok(Array.isArray(payload.errors));
  assert.ok(payload.errors.length > 0);
  for (const error of payload.errors) {
    assert.ok(Object.hasOwn(error, 'code'));
    assert.ok(Object.hasOwn(error, 'message'));
    assert.ok(Object.hasOwn(error, 'file'));
    assert.ok(Object.hasOwn(error, 'hint'));
  }
});

test('pretty output includes error codes', () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, 'validate', invalidDataset, '--pretty'],
    { encoding: 'utf8' }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Validation failed/);
  assert.match(result.stderr, /\[E_DIR_MISSING\]/);
});

test('json output for GitHub URL input is still JSON', () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, 'validate', 'https://github.com/foo', '--json'],
    { encoding: 'utf8' }
  );

  assert.equal(result.status, 2);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.errors[0].code, 'E_GITHUB_URL_INVALID_FORMAT');
});

test('json output for usage errors stays JSON', () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, 'validate', '--json'],
    { encoding: 'utf8' }
  );

  assert.equal(result.status, 2);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.errors[0].code, 'E_USAGE');
});
