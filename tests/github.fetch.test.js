const assert = require('node:assert/strict');
const test = require('node:test');

const { fetchGitHubSnapshotToTempDir } = require('../dist/github/fetch');

const repoRef = { owner: 'owner', repo: 'repo' };

function makeJsonResponse(status, body, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers });
}

function withMockedFetch(mockFetch, fn) {
  const originalFetch = global.fetch;
  global.fetch = mockFetch;
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      global.fetch = originalFetch;
    });
}

test('maps repo 404 to E_GITHUB_NOT_FOUND', async () => {
  await withMockedFetch(async () => makeJsonResponse(404, {}), async () => {
    const result = await fetchGitHubSnapshotToTempDir(repoRef);
    assert.equal(result.ok, false);
    assert.equal(result.errors[0].code, 'E_GITHUB_NOT_FOUND');
  });
});

test('maps repo 401 to E_GITHUB_AUTH_REQUIRED', async () => {
  await withMockedFetch(async () => makeJsonResponse(401, {}), async () => {
    const result = await fetchGitHubSnapshotToTempDir(repoRef);
    assert.equal(result.ok, false);
    assert.equal(result.errors[0].code, 'E_GITHUB_AUTH_REQUIRED');
  });
});

test('maps repo 403 with rate limit headers to E_GITHUB_RATE_LIMITED', async () => {
  await withMockedFetch(
    async () =>
      makeJsonResponse(403, {}, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1' }),
    async () => {
      const result = await fetchGitHubSnapshotToTempDir(repoRef);
      assert.equal(result.ok, false);
      assert.equal(result.errors[0].code, 'E_GITHUB_RATE_LIMITED');
    }
  );
});

test('maps missing ref to E_GITHUB_REF_NOT_FOUND', async () => {
  await withMockedFetch(
    async (url) => {
      if (url.includes('/repos/owner/repo') && !url.includes('/commits/')) {
        return makeJsonResponse(200, { default_branch: 'main' });
      }
      if (url.includes('/commits/main')) {
        return makeJsonResponse(404, {});
      }
      return makeJsonResponse(500, {});
    },
    async () => {
      const result = await fetchGitHubSnapshotToTempDir(repoRef);
      assert.equal(result.ok, false);
      assert.equal(result.errors[0].code, 'E_GITHUB_REF_NOT_FOUND');
    }
  );
});

test('maps raw fetch failures to E_GITHUB_FETCH_FAILED', async () => {
  await withMockedFetch(
    async (url) => {
      if (url.includes('/commits/main')) {
        return makeJsonResponse(200, {
          sha: 'commit-sha',
          commit: { tree: { sha: 'tree-sha' } }
        });
      }
      if (url.includes('/git/trees/tree-sha')) {
        return makeJsonResponse(200, {
          truncated: false,
          tree: [{ path: 'datasets/dataset.md', type: 'blob' }]
        });
      }
      if (url.includes('raw.githubusercontent.com')) {
        return new Response('missing', { status: 404 });
      }
      if (url.includes('/repos/owner/repo') && !url.includes('/commits/')) {
        return makeJsonResponse(200, { default_branch: 'main' });
      }
      return makeJsonResponse(500, {});
    },
    async () => {
      const result = await fetchGitHubSnapshotToTempDir(repoRef);
      assert.equal(result.ok, false);
      assert.equal(result.errors[0].code, 'E_GITHUB_FETCH_FAILED');
    }
  );
});

test('rejects subdir traversal before fetching', async () => {
  await withMockedFetch(
    async () => {
      throw new Error('fetch should not be called');
    },
    async () => {
      const result = await fetchGitHubSnapshotToTempDir({
        owner: 'owner',
        repo: 'repo',
        subdir: 'a/../b'
      });
      assert.equal(result.ok, false);
      assert.equal(result.errors[0].code, 'E_GITHUB_URL_INVALID_FORMAT');
    }
  );
});
