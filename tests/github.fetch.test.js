const assert = require('node:assert/strict');
const test = require('node:test');

const { fetchGitHubSnapshotToTempDir } = require('../dist/github/fetch');

const originalFetch = global.fetch;

function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
  });
}

test('repo endpoint 404 maps to E_GITHUB_NOT_FOUND', async (t) => {
  global.fetch = async () => new Response('not found', { status: 404 });
  t.after(() => {
    global.fetch = originalFetch;
  });

  const result = await fetchGitHubSnapshotToTempDir({ owner: 'foo', repo: 'bar' });
  assert.equal(result.ok, false);
  assert.equal(result.errors[0].code, 'E_GITHUB_NOT_FOUND');
});

test('repo endpoint 401 maps to E_GITHUB_AUTH_REQUIRED', async (t) => {
  global.fetch = async () => new Response('unauthorized', { status: 401 });
  t.after(() => {
    global.fetch = originalFetch;
  });

  const result = await fetchGitHubSnapshotToTempDir({ owner: 'foo', repo: 'bar' });
  assert.equal(result.ok, false);
  assert.equal(result.errors[0].code, 'E_GITHUB_AUTH_REQUIRED');
});

test('rate limited responses map to E_GITHUB_RATE_LIMITED', async (t) => {
  global.fetch = async () =>
    new Response('rate limit', {
      status: 403,
      headers: { 'x-ratelimit-remaining': '0' }
    });
  t.after(() => {
    global.fetch = originalFetch;
  });

  const result = await fetchGitHubSnapshotToTempDir({ owner: 'foo', repo: 'bar' });
  assert.equal(result.ok, false);
  assert.equal(result.errors[0].code, 'E_GITHUB_RATE_LIMITED');
});

test('commit endpoint 404 maps to E_GITHUB_REF_NOT_FOUND', async (t) => {
  global.fetch = async (url) => {
    if (url.endsWith('/repos/foo/bar')) {
      return jsonResponse({ default_branch: 'main' });
    }
    if (url.includes('/commits/')) {
      return new Response('not found', { status: 404 });
    }
    throw new Error(`Unexpected URL ${url}`);
  };
  t.after(() => {
    global.fetch = originalFetch;
  });

  const result = await fetchGitHubSnapshotToTempDir({ owner: 'foo', repo: 'bar' });
  assert.equal(result.ok, false);
  assert.equal(result.errors[0].code, 'E_GITHUB_REF_NOT_FOUND');
});

test('raw fetch 404 maps to E_GITHUB_FETCH_FAILED', async (t) => {
  global.fetch = async (url) => {
    if (url.endsWith('/repos/foo/bar')) {
      return jsonResponse({ default_branch: 'main' });
    }
    if (url.includes('/commits/')) {
      return jsonResponse({
        sha: 'commitsha',
        commit: { tree: { sha: 'treesha' } }
      });
    }
    if (url.includes('/git/trees/')) {
      return jsonResponse({
        truncated: false,
        tree: [{ path: 'datasets/dataset.md', type: 'blob' }]
      });
    }
    if (url.includes('raw.githubusercontent.com')) {
      return new Response('not found', { status: 404 });
    }
    throw new Error(`Unexpected URL ${url}`);
  };
  t.after(() => {
    global.fetch = originalFetch;
  });

  const result = await fetchGitHubSnapshotToTempDir({ owner: 'foo', repo: 'bar' });
  assert.equal(result.ok, false);
  assert.equal(result.errors[0].code, 'E_GITHUB_FETCH_FAILED');
});

test('subdir traversal is rejected before network calls', async (t) => {
  global.fetch = async () => {
    throw new Error('fetch should not be called');
  };
  t.after(() => {
    global.fetch = originalFetch;
  });

  const result = await fetchGitHubSnapshotToTempDir({
    owner: 'foo',
    repo: 'bar',
    subdir: '../secrets'
  });
  assert.equal(result.ok, false);
  assert.equal(result.errors[0].code, 'E_GITHUB_URL_INVALID_FORMAT');
});
