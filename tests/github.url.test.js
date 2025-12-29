const assert = require('node:assert/strict');
const test = require('node:test');

const { parseGitHubRepoUrl } = require('../dist/github/url');

function expectOk(input, expected) {
  const result = parseGitHubRepoUrl(input);
  assert.equal(result.ok, true, `Expected ok for ${input}`);
  assert.deepEqual(result.value, expected);
}

function expectError(input) {
  const result = parseGitHubRepoUrl(input);
  assert.equal(result.ok, false, `Expected error for ${input}`);
  assert.equal(result.error.code, 'E_GITHUB_URL_INVALID_FORMAT');
}

test('parseGitHubRepoUrl accepts basic repo URLs', () => {
  expectOk('github.com/foo/bar', { owner: 'foo', repo: 'bar' });
  expectOk('https://github.com/foo/bar', { owner: 'foo', repo: 'bar' });
});

test('parseGitHubRepoUrl normalizes trailing slash and .git', () => {
  expectOk('https://github.com/foo/bar/', { owner: 'foo', repo: 'bar' });
  expectOk('github.com/foo/bar.git', { owner: 'foo', repo: 'bar' });
});

test('parseGitHubRepoUrl parses tree refs and subdirs', () => {
  expectOk('https://github.com/foo/bar/tree/main', {
    owner: 'foo',
    repo: 'bar',
    ref: 'main',
    subdir: undefined
  });
  expectOk('https://github.com/foo/bar/tree/main/some/subdir', {
    owner: 'foo',
    repo: 'bar',
    ref: 'main',
    subdir: 'some/subdir'
  });
});

test('parseGitHubRepoUrl ignores query and hash', () => {
  expectOk('https://github.com/foo/bar?tab=readme', {
    owner: 'foo',
    repo: 'bar'
  });
  expectOk('https://github.com/foo/bar/tree/main/path#readme', {
    owner: 'foo',
    repo: 'bar',
    ref: 'main',
    subdir: 'path'
  });
});

test('parseGitHubRepoUrl rejects unsupported formats', () => {
  expectError('https://github.com/foo');
  expectError('https://github.com/foo/bar/issues');
  expectError('https://github.com/foo/bar/tree');
  expectError('https://github.com/foo/bar/tree/main/../secrets');
});
