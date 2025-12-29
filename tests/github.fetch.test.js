const assert = require('node:assert/strict');
const test = require('node:test');

const { fetchGitHubSnapshotToTempDir } = require('../dist/github/fetch');

function mockResponse({ status = 200, json, text, headers = {} }) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) {
        return headers[name.toLowerCase()] ?? null;
      },
      forEach(cb) {
        for (const [key, value] of Object.entries(headers)) {
          cb(value, key);
        }
      }
    },
    async text() {
      if (text !== undefined) {
        return text;
      }
      return json ? JSON.stringify(json) : '';
    },
    async arrayBuffer() {
      return new TextEncoder().encode('content').buffer;
    }
  };
}

async function withMockedFetch(impl, fn) {
  const originalFetch = global.fetch;
  global.fetch = impl;
  try {
    await fn();
  } finally {
    global.fetch = originalFetch;
  }
}

test('repo endpoint 404 yields not found error', async () => {
  await withMockedFetch(async () => mockResponse({ status: 404 }), async () => {
    const result = await fetchGitHubSnapshotToTempDir({
      owner: 'foo',
      repo: 'bar'
    });
    assert.equal(result.ok, false);
    assert.equal(result.errors[0].code, 'E_GITHUB_NOT_FOUND');
  });
});

test('repo endpoint 401 yields auth required error', async () => {
  await withMockedFetch(async () => mockResponse({ status: 401 }), async () => {
    const result = await fetchGitHubSnapshotToTempDir({
      owner: 'foo',
      repo: 'bar'
    });
    assert.equal(result.ok, false);
    assert.equal(result.errors[0].code, 'E_GITHUB_AUTH_REQUIRED');
  });
});

test('repo endpoint rate limited yields rate limit error', async () => {
  await withMockedFetch(
    async () =>
      mockResponse({
        status: 403,
        headers: { 'x-ratelimit-remaining': '0' }
      }),
    async () => {
      const result = await fetchGitHubSnapshotToTempDir({
        owner: 'foo',
        repo: 'bar'
      });
      assert.equal(result.ok, false);
      assert.equal(result.errors[0].code, 'E_GITHUB_RATE_LIMITED');
    }
  );
});

test('commit endpoint 404 yields ref not found error', async () => {
  await withMockedFetch(
    async (url) => {
      if (url === 'https://api.github.com/repos/foo/bar') {
        return mockResponse({ status: 200, json: { default_branch: 'main' } });
      }
      if (url.includes('/commits/')) {
        return mockResponse({ status: 404 });
      }
      return mockResponse({ status: 500 });
    },
    async () => {
      const result = await fetchGitHubSnapshotToTempDir({
        owner: 'foo',
        repo: 'bar'
      });
      assert.equal(result.ok, false);
      assert.equal(result.errors[0].code, 'E_GITHUB_REF_NOT_FOUND');
    }
  );
});

test('raw fetch failure yields fetch failed error', async () => {
  await withMockedFetch(
    async (url) => {
      if (url === 'https://api.github.com/repos/foo/bar') {
        return mockResponse({ status: 200, json: { default_branch: 'main' } });
      }
      if (url.includes('/commits/')) {
        return mockResponse({
          status: 200,
          json: { sha: 'abc123', commit: { tree: { sha: 'tree123' } } }
        });
      }
      if (url.includes('/git/trees/')) {
        return mockResponse({
          status: 200,
          json: { tree: [{ path: 'datasets/data.md', type: 'blob' }] }
        });
      }
      if (url.includes('raw.githubusercontent.com')) {
        return mockResponse({ status: 404 });
      }
      return mockResponse({ status: 500 });
    },
    async () => {
      const result = await fetchGitHubSnapshotToTempDir({
        owner: 'foo',
        repo: 'bar'
      });
      assert.equal(result.ok, false);
      assert.equal(result.errors[0].code, 'E_GITHUB_FETCH_FAILED');
    }
  );
});

test('subdir traversal is rejected', async () => {
  await withMockedFetch(async () => mockResponse({ status: 404 }), async () => {
    const result = await fetchGitHubSnapshotToTempDir({
      owner: 'foo',
      repo: 'bar',
      subdir: '../secrets'
    });
    assert.equal(result.ok, false);
    assert.equal(result.errors[0].code, 'E_GITHUB_FETCH_FAILED');
  });
});
