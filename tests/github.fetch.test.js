const assert = require('node:assert/strict');
const test = require('node:test');

const { fetchGitHubSnapshotToTempDir } = require('../dist/github/fetch');

function mockFetch(handler) {
  const original = global.fetch;
  global.fetch = handler;
  return () => {
    global.fetch = original;
  };
}

function makeJsonResponse(status, body, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers });
}

function makeTextResponse(status, body, headers = {}) {
  return new Response(body, { status, headers });
}

const baseRepo = { owner: 'octo', repo: 'repo' };

test('repo endpoint 404 yields not found', async () => {
  const restore = mockFetch(async () => makeJsonResponse(404, {}));
  try {
    const result = await fetchGitHubSnapshotToTempDir(baseRepo);
    assert.equal(result.ok, false);
    assert.equal(result.errors[0].code, 'E_GITHUB_NOT_FOUND');
  } finally {
    restore();
  }
});

test('repo endpoint 401 yields auth required', async () => {
  const restore = mockFetch(async () => makeJsonResponse(401, {}));
  try {
    const result = await fetchGitHubSnapshotToTempDir(baseRepo);
    assert.equal(result.ok, false);
    assert.equal(result.errors[0].code, 'E_GITHUB_AUTH_REQUIRED');
  } finally {
    restore();
  }
});

test('repo endpoint 403 with rate limit header yields rate limited', async () => {
  const restore = mockFetch(async () =>
    makeJsonResponse(403, { message: 'rate limit' }, { 'x-ratelimit-remaining': '0' })
  );
  try {
    const result = await fetchGitHubSnapshotToTempDir(baseRepo);
    assert.equal(result.ok, false);
    assert.equal(result.errors[0].code, 'E_GITHUB_RATE_LIMITED');
  } finally {
    restore();
  }
});

test('commit endpoint 404 yields ref not found', async () => {
  let callCount = 0;
  const restore = mockFetch(async () => {
    callCount += 1;
    if (callCount === 1) {
      return makeJsonResponse(200, { default_branch: 'main' });
    }
    return makeJsonResponse(404, {});
  });
  try {
    const result = await fetchGitHubSnapshotToTempDir(baseRepo);
    assert.equal(result.ok, false);
    assert.equal(result.errors[0].code, 'E_GITHUB_REF_NOT_FOUND');
  } finally {
    restore();
  }
});

test('raw fetch 404 yields fetch failed', async () => {
  let callCount = 0;
  const restore = mockFetch(async (url) => {
    callCount += 1;
    if (callCount === 1) {
      return makeJsonResponse(200, { default_branch: 'main' });
    }
    if (callCount === 2) {
      return makeJsonResponse(200, {
        sha: 'commit-sha',
        commit: { tree: { sha: 'tree-sha' } }
      });
    }
    if (callCount === 3) {
      return makeJsonResponse(200, {
        truncated: false,
        tree: [
          { path: 'datasets', type: 'tree' },
          { path: 'datasets/dataset.md', type: 'blob' }
        ]
      });
    }
    if (String(url).includes('raw.githubusercontent.com')) {
      return makeTextResponse(404, 'not found');
    }
    return makeJsonResponse(500, {});
  });
  try {
    const result = await fetchGitHubSnapshotToTempDir(baseRepo);
    assert.equal(result.ok, false);
    assert.equal(result.errors[0].code, 'E_GITHUB_FETCH_FAILED');
  } finally {
    restore();
  }
});

test('rejects subdir traversal', async () => {
  const restore = mockFetch(async () => makeJsonResponse(200, {}));
  try {
    const result = await fetchGitHubSnapshotToTempDir({
      owner: 'octo',
      repo: 'repo',
      subdir: '../secrets'
    });
    assert.equal(result.ok, false);
    assert.equal(result.errors[0].code, 'E_GITHUB_FETCH_FAILED');
  } finally {
    restore();
  }
});
