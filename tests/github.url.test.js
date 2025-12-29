const assert = require('node:assert/strict');
const test = require('node:test');

const { parseGitHubRepoUrl } = require('../dist/github/url');

test('parse GitHub repo url without scheme', () => {
  const result = parseGitHubRepoUrl('github.com/foo/bar');
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, { owner: 'foo', repo: 'bar' });
});

test('parse GitHub repo url with scheme', () => {
  const result = parseGitHubRepoUrl('https://github.com/foo/bar');
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, { owner: 'foo', repo: 'bar' });
});

test('parse GitHub repo url with trailing slash', () => {
  const result = parseGitHubRepoUrl('https://github.com/foo/bar/');
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, { owner: 'foo', repo: 'bar' });
});

test('parse GitHub repo url with .git suffix', () => {
  const result = parseGitHubRepoUrl('https://github.com/foo/bar.git');
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, { owner: 'foo', repo: 'bar' });
});

test('parse GitHub repo url with tree ref', () => {
  const result = parseGitHubRepoUrl('https://github.com/foo/bar/tree/main');
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, { owner: 'foo', repo: 'bar', ref: 'main' });
});

test('parse GitHub repo url with tree ref and subdir', () => {
  const result = parseGitHubRepoUrl(
    'https://github.com/foo/bar/tree/main/some/subdir'
  );
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, {
    owner: 'foo',
    repo: 'bar',
    ref: 'main',
    subdir: 'some/subdir'
  });
});

test('parse GitHub repo url ignores query', () => {
  const result = parseGitHubRepoUrl('https://github.com/foo/bar?tab=readme');
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, { owner: 'foo', repo: 'bar' });
});

test('parse GitHub repo url rejects missing repo', () => {
  const result = parseGitHubRepoUrl('https://github.com/foo');
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'E_GITHUB_URL_INVALID_FORMAT');
});

test('parse GitHub repo url rejects unsupported segment', () => {
  const result = parseGitHubRepoUrl('https://github.com/foo/bar/issues');
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'E_GITHUB_URL_INVALID_FORMAT');
});

test('parse GitHub repo url rejects tree without ref', () => {
  const result = parseGitHubRepoUrl('https://github.com/foo/bar/tree');
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'E_GITHUB_URL_INVALID_FORMAT');
});

test('parse GitHub repo url rejects traversal in subdir', () => {
  const result = parseGitHubRepoUrl('https://github.com/foo/bar/tree/main/../secret');
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'E_GITHUB_URL_INVALID_FORMAT');
});
