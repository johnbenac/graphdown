const assert = require('node:assert/strict');
const test = require('node:test');

const { parseGitHubRepoUrl } = require('../dist/github/url');

function expectOk(input, expected) {
  const result = parseGitHubRepoUrl(input);
  assert.equal(result.ok, true, `expected ok for ${input}`);
  assert.deepEqual(result.value, expected);
}

function expectInvalid(input) {
  const result = parseGitHubRepoUrl(input);
  assert.equal(result.ok, false, `expected error for ${input}`);
  assert.equal(result.error.code, 'E_GITHUB_URL_INVALID_FORMAT');
}

test('parses basic GitHub URLs', () => {
  expectOk('github.com/foo/bar', { owner: 'foo', repo: 'bar' });
  expectOk('https://github.com/foo/bar', { owner: 'foo', repo: 'bar' });
  expectOk('https://github.com/foo/bar/', { owner: 'foo', repo: 'bar' });
  expectOk('https://github.com/foo/bar.git', { owner: 'foo', repo: 'bar' });
});

test('parses tree URLs with refs and subdirs', () => {
  expectOk('https://github.com/foo/bar/tree/main', {
    owner: 'foo',
    repo: 'bar',
    ref: 'main'
  });
  expectOk('https://github.com/foo/bar/tree/main/some/subdir', {
    owner: 'foo',
    repo: 'bar',
    ref: 'main',
    subdir: 'some/subdir'
  });
});

test('ignores query and hash', () => {
  expectOk('https://github.com/foo/bar?tab=readme', {
    owner: 'foo',
    repo: 'bar'
  });
  expectOk('https://github.com/foo/bar/tree/main/docs#intro', {
    owner: 'foo',
    repo: 'bar',
    ref: 'main',
    subdir: 'docs'
  });
});

test('rejects unsupported or invalid URLs', () => {
  expectInvalid('https://github.com/foo');
  expectInvalid('https://github.com/foo/bar/issues');
  expectInvalid('https://github.com/foo/bar/tree');
  expectInvalid('https://github.com/foo/bar/tree/');
  expectInvalid('https://github.com/foo/bar/tree/main/../secrets');
});
