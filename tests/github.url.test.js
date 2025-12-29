const assert = require('node:assert/strict');
const test = require('node:test');

const { parseGitHubRepoUrl } = require('../dist/github/url');

test('parses github.com/owner/repo', () => {
  const parsed = parseGitHubRepoUrl('github.com/foo/bar');
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.value, { owner: 'foo', repo: 'bar' });
});

test('parses https://github.com/owner/repo', () => {
  const parsed = parseGitHubRepoUrl('https://github.com/foo/bar');
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.value, { owner: 'foo', repo: 'bar' });
});

test('parses trailing slash and .git suffix', () => {
  const parsed = parseGitHubRepoUrl('https://github.com/foo/bar.git/');
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.value, { owner: 'foo', repo: 'bar' });
});

test('parses /tree/main', () => {
  const parsed = parseGitHubRepoUrl('https://github.com/foo/bar/tree/main');
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.value, { owner: 'foo', repo: 'bar', ref: 'main' });
});

test('parses /tree/main/subdir', () => {
  const parsed = parseGitHubRepoUrl(
    'https://github.com/foo/bar/tree/main/some/subdir'
  );
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.value, {
    owner: 'foo',
    repo: 'bar',
    ref: 'main',
    subdir: 'some/subdir'
  });
});

test('ignores query and hash', () => {
  const parsed = parseGitHubRepoUrl(
    'https://github.com/foo/bar?tab=readme#heading'
  );
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.value, { owner: 'foo', repo: 'bar' });
});

test('rejects missing repo', () => {
  const parsed = parseGitHubRepoUrl('https://github.com/foo');
  assert.equal(parsed.ok, false);
  assert.equal(parsed.error.code, 'E_GITHUB_URL_INVALID_FORMAT');
});

test('rejects unsupported extra segment', () => {
  const parsed = parseGitHubRepoUrl('https://github.com/foo/bar/issues');
  assert.equal(parsed.ok, false);
  assert.equal(parsed.error.code, 'E_GITHUB_URL_INVALID_FORMAT');
});

test('rejects /tree missing ref', () => {
  const parsed = parseGitHubRepoUrl('https://github.com/foo/bar/tree');
  assert.equal(parsed.ok, false);
  assert.equal(parsed.error.code, 'E_GITHUB_URL_INVALID_FORMAT');
});

test('rejects subdir traversal', () => {
  const parsed = parseGitHubRepoUrl(
    'https://github.com/foo/bar/tree/main/../secrets'
  );
  assert.equal(parsed.ok, false);
  assert.equal(parsed.error.code, 'E_GITHUB_URL_INVALID_FORMAT');
});
