import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ValidationError, makeError } from '../core/errors';
import { GitHubRepoRef, normalizeGitHubSubdir } from './url';

export type GitHubSnapshotResult =
  | {
      ok: true;
      rootDir: string;
      cleanup: () => Promise<void>;
    }
  | {
      ok: false;
      errors: ValidationError[];
    };

function getRateLimitHint(headers: Headers): string | undefined {
  const reset = headers.get('x-ratelimit-reset');
  if (!reset) {
    return undefined;
  }
  const resetSeconds = Number(reset);
  if (!Number.isFinite(resetSeconds)) {
    return undefined;
  }
  const resetDate = new Date(resetSeconds * 1000).toISOString();
  return `Rate limit resets at ${resetDate}.`;
}

function isRateLimited(response: Response): boolean {
  if (response.status === 429) {
    return true;
  }
  if (response.status !== 403) {
    return false;
  }
  const remaining = response.headers.get('x-ratelimit-remaining');
  if (remaining === '0') {
    return true;
  }
  return false;
}

function buildHeaders(token?: string): HeadersInit {
  const headers: Record<string, string> = {
    'User-Agent': 'graphdown'
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function fetchJson(
  url: string,
  token?: string
): Promise<{ ok: true; response: Response; json: any } | { ok: false; error: ValidationError }> {
  let response: Response;
  try {
    response = await fetch(url, { headers: buildHeaders(token) });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: makeError('E_GITHUB_FETCH_FAILED', `GitHub fetch failed: ${message}`)
    };
  }

  let json: any;
  try {
    json = await response.json();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: makeError('E_GITHUB_FETCH_FAILED', `GitHub response invalid: ${message}`)
    };
  }

  if (response.status === 429) {
    return {
      ok: false,
      error: makeError(
        'E_GITHUB_RATE_LIMITED',
        'GitHub API rate limit exceeded.',
        undefined,
        getRateLimitHint(response.headers)
      )
    };
  }

  if (response.status === 401) {
    return {
      ok: false,
      error: makeError('E_GITHUB_AUTH_REQUIRED', 'GitHub authentication required.')
    };
  }

  if (response.status === 403) {
    const message = typeof json?.message === 'string' ? json.message : '';
    const rateLimited = isRateLimited(response) || /rate limit/i.test(message);
    if (rateLimited) {
      return {
        ok: false,
        error: makeError(
          'E_GITHUB_RATE_LIMITED',
          'GitHub API rate limit exceeded.',
          undefined,
          getRateLimitHint(response.headers)
        )
      };
    }
    return {
      ok: false,
      error: makeError('E_GITHUB_AUTH_REQUIRED', 'GitHub authentication required.')
    };
  }

  return { ok: true, response, json };
}

function normalizeSubdir(subdir?: string): { ok: true; value?: string } | { ok: false; error: ValidationError } {
  return normalizeGitHubSubdir(subdir);
}

export async function fetchGitHubSnapshotToTempDir(
  repo: GitHubRepoRef,
  opts?: { token?: string }
): Promise<GitHubSnapshotResult> {
  const token = opts?.token;
  const normalizedSubdir = normalizeSubdir(repo.subdir);
  if (!normalizedSubdir.ok) {
    return { ok: false, errors: [normalizedSubdir.error] };
  }
  const subdir = normalizedSubdir.value;

  const repoUrl = `https://api.github.com/repos/${repo.owner}/${repo.repo}`;
  const repoResult = await fetchJson(repoUrl, token);
  if (!repoResult.ok) {
    return { ok: false, errors: [repoResult.error] };
  }
  if (repoResult.response.status === 404) {
    return {
      ok: false,
      errors: [makeError('E_GITHUB_NOT_FOUND', 'GitHub repository not found.')]
    };
  }
  if (!repoResult.response.ok) {
    return {
      ok: false,
      errors: [
        makeError(
          'E_GITHUB_FETCH_FAILED',
          `GitHub repo lookup failed with status ${repoResult.response.status}.`
        )
      ]
    };
  }

  const defaultBranch = repoResult.json?.default_branch;
  const ref = repo.ref || defaultBranch;
  if (!ref || typeof ref !== 'string') {
    return {
      ok: false,
      errors: [
        makeError('E_GITHUB_FETCH_FAILED', 'Unable to determine repository ref.')
      ]
    };
  }

  const commitUrl = `https://api.github.com/repos/${repo.owner}/${repo.repo}/commits/${encodeURIComponent(
    ref
  )}`;
  const commitResult = await fetchJson(commitUrl, token);
  if (!commitResult.ok) {
    return { ok: false, errors: [commitResult.error] };
  }
  if (commitResult.response.status === 404) {
    return {
      ok: false,
      errors: [
        makeError('E_GITHUB_REF_NOT_FOUND', `GitHub ref not found: ${ref}.`)
      ]
    };
  }
  if (!commitResult.response.ok) {
    return {
      ok: false,
      errors: [
        makeError(
          'E_GITHUB_FETCH_FAILED',
          `GitHub ref lookup failed with status ${commitResult.response.status}.`
        )
      ]
    };
  }

  const commitSha = commitResult.json?.sha;
  const treeSha = commitResult.json?.commit?.tree?.sha;
  if (!commitSha || !treeSha) {
    return {
      ok: false,
      errors: [
        makeError('E_GITHUB_FETCH_FAILED', 'GitHub ref response missing SHA data.')
      ]
    };
  }

  const treeUrl = `https://api.github.com/repos/${repo.owner}/${repo.repo}/git/trees/${treeSha}?recursive=1`;
  const treeResult = await fetchJson(treeUrl, token);
  if (!treeResult.ok) {
    return { ok: false, errors: [treeResult.error] };
  }
  if (!treeResult.response.ok) {
    return {
      ok: false,
      errors: [
        makeError(
          'E_GITHUB_FETCH_FAILED',
          `GitHub tree fetch failed with status ${treeResult.response.status}.`
        )
      ]
    };
  }
  if (treeResult.json?.truncated) {
    return {
      ok: false,
      errors: [
        makeError(
          'E_GITHUB_FETCH_FAILED',
          'GitHub tree listing was truncated.',
          undefined,
          'Use --subdir to limit the scope of the snapshot.'
        )
      ]
    };
  }

  const treeEntries: Array<{ path: string; type: string }> = Array.isArray(
    treeResult.json?.tree
  )
    ? treeResult.json.tree
    : [];

  const mdEntries = treeEntries.filter(
    (entry) => entry.type === 'blob' && entry.path.toLowerCase().endsWith('.md')
  );

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'graphdown-'));
  const cleanup = async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  };

  const prefix = subdir ? `${subdir}/` : '';
  const filteredEntries = mdEntries.filter((entry) => {
    if (!prefix) {
      return true;
    }
    return entry.path === subdir || entry.path.startsWith(prefix);
  });

  try {
    for (const entry of filteredEntries) {
      if (entry.path === subdir) {
        continue;
      }
      const relativePath = prefix ? entry.path.slice(prefix.length) : entry.path;
      if (!relativePath) {
        continue;
      }
      const destinationPath = path.join(tmpDir, relativePath);
      const destinationDir = path.dirname(destinationPath);
      await fs.mkdir(destinationDir, { recursive: true });

      const rawUrl = `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/${commitSha}/${entry.path}`;
      let rawResponse: Response;
      try {
        rawResponse = await fetch(rawUrl, { headers: buildHeaders(token) });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          ok: false,
          errors: [
            makeError('E_GITHUB_FETCH_FAILED', `GitHub raw fetch failed: ${message}`)
          ]
        };
      }

      if (isRateLimited(rawResponse)) {
        return {
          ok: false,
          errors: [
            makeError(
              'E_GITHUB_RATE_LIMITED',
              'GitHub API rate limit exceeded.',
              undefined,
              getRateLimitHint(rawResponse.headers)
            )
          ]
        };
      }
      if (rawResponse.status === 401 || rawResponse.status === 403) {
        return {
          ok: false,
          errors: [
            makeError('E_GITHUB_AUTH_REQUIRED', 'GitHub authentication required.')
          ]
        };
      }
      if (!rawResponse.ok) {
        return {
          ok: false,
          errors: [
            makeError(
              'E_GITHUB_FETCH_FAILED',
              `GitHub raw fetch failed with status ${rawResponse.status}.`
            )
          ]
        };
      }

      const buffer = new Uint8Array(await rawResponse.arrayBuffer());
      await fs.writeFile(destinationPath, buffer);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await cleanup();
    return {
      ok: false,
      errors: [
        makeError('E_GITHUB_FETCH_FAILED', `GitHub snapshot failed: ${message}`)
      ]
    };
  }

  return { ok: true, rootDir: tmpDir, cleanup };
}
