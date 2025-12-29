import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { makeError, ValidationError } from '../core/errors';
import { GitHubRepoRef } from './url';

export type GitHubSnapshotResult =
  | {
      ok: true;
      rootDir: string;
      cleanup: () => Promise<void>;
    }
  | { ok: false; errors: ValidationError[] };

interface FetchOptions {
  token?: string;
}

const userAgent = 'graphdown';

function normalizeSubdir(subdir?: string): string | undefined {
  if (!subdir) return undefined;
  const trimmed = subdir.replace(/^\/+|\/+$/g, '');
  if (!trimmed) return undefined;
  const segments = trimmed.split('/');
  if (segments.some((segment) => segment === '' || segment === '..')) {
    return undefined;
  }
  return segments.join('/');
}

function buildHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': userAgent,
    Accept: 'application/vnd.github+json'
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function getRateLimitHint(headers: Headers): string | undefined {
  const reset = headers.get('x-ratelimit-reset');
  if (!reset) return undefined;
  const timestamp = Number(reset) * 1000;
  if (!Number.isFinite(timestamp)) return undefined;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return undefined;
  return `Rate limit resets at ${date.toISOString()}.`;
}

async function readBodyText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

async function classifyError(
  response: Response,
  context: 'repo' | 'commit' | 'tree' | 'raw',
  details: { owner: string; repo: string; ref?: string }
): Promise<ValidationError> {
  const status = response.status;
  const bodyText = await readBodyText(response);
  const isRateLimited =
    status === 429 ||
    (status === 403 &&
      (response.headers.get('x-ratelimit-remaining') === '0' ||
        bodyText.toLowerCase().includes('rate limit')));

  if (isRateLimited) {
    return makeError(
      'E_GITHUB_RATE_LIMITED',
      'GitHub API rate limit exceeded.',
      undefined,
      getRateLimitHint(response.headers)
    );
  }

  if (context === 'repo' && status === 404) {
    return makeError(
      'E_GITHUB_NOT_FOUND',
      `GitHub repository ${details.owner}/${details.repo} not found.`
    );
  }

  if (context === 'commit' && status === 404) {
    return makeError(
      'E_GITHUB_REF_NOT_FOUND',
      `GitHub ref "${details.ref}" not found in ${details.owner}/${details.repo}.`
    );
  }

  if (status === 401 || status === 403) {
    return makeError(
      'E_GITHUB_AUTH_REQUIRED',
      'GitHub API request requires authentication.'
    );
  }

  const message = `GitHub fetch failed (${status} ${response.statusText}).`;
  return makeError('E_GITHUB_FETCH_FAILED', message);
}

async function fetchJson<T>(
  url: string,
  headers: Record<string, string>,
  context: 'repo' | 'commit' | 'tree',
  details: { owner: string; repo: string; ref?: string }
): Promise<{ ok: true; data: T } | { ok: false; error: ValidationError }> {
  let response: Response;
  try {
    response = await fetch(url, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: makeError('E_GITHUB_FETCH_FAILED', `GitHub fetch failed: ${message}`)
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      error: await classifyError(response, context, details)
    };
  }

  try {
    const data = (await response.json()) as T;
    return { ok: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: makeError('E_GITHUB_FETCH_FAILED', `GitHub response invalid: ${message}`)
    };
  }
}

async function fetchRaw(
  url: string,
  headers: Record<string, string>,
  details: { owner: string; repo: string; ref?: string }
): Promise<{ ok: true; data: string } | { ok: false; error: ValidationError }> {
  let response: Response;
  try {
    response = await fetch(url, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: makeError('E_GITHUB_FETCH_FAILED', `GitHub fetch failed: ${message}`)
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      error: await classifyError(response, 'raw', details)
    };
  }

  try {
    return { ok: true, data: await response.text() };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: makeError('E_GITHUB_FETCH_FAILED', `GitHub response invalid: ${message}`)
    };
  }
}

function isMarkdownFile(pathname: string): boolean {
  return pathname.toLowerCase().endsWith('.md');
}

function matchesSubdir(pathname: string, subdir?: string): boolean {
  if (!subdir) return true;
  return pathname === subdir || pathname.startsWith(`${subdir}/`);
}

function stripSubdir(pathname: string, subdir?: string): string {
  if (!subdir) return pathname;
  if (pathname.startsWith(`${subdir}/`)) {
    return pathname.slice(subdir.length + 1);
  }
  return pathname;
}

export async function fetchGitHubSnapshotToTempDir(
  repo: GitHubRepoRef,
  opts?: FetchOptions
): Promise<GitHubSnapshotResult> {
  const normalizedSubdir = normalizeSubdir(repo.subdir);
  if (repo.subdir && !normalizedSubdir) {
    return {
      ok: false,
      errors: [
        makeError(
          'E_GITHUB_FETCH_FAILED',
          `Invalid subdirectory path: ${repo.subdir}`
        )
      ]
    };
  }

  const headers = buildHeaders(opts?.token);

  const repoUrl = `https://api.github.com/repos/${repo.owner}/${repo.repo}`;
  const repoResponse = await fetchJson<{ default_branch: string }>(
    repoUrl,
    headers,
    'repo',
    { owner: repo.owner, repo: repo.repo }
  );
  if (!repoResponse.ok) {
    return { ok: false, errors: [repoResponse.error] };
  }

  const ref = repo.ref ?? repoResponse.data.default_branch;
  const commitUrl = `https://api.github.com/repos/${repo.owner}/${repo.repo}/commits/${ref}`;
  const commitResponse = await fetchJson<{ sha: string; commit: { tree: { sha: string } } }>(
    commitUrl,
    headers,
    'commit',
    { owner: repo.owner, repo: repo.repo, ref }
  );
  if (!commitResponse.ok) {
    return { ok: false, errors: [commitResponse.error] };
  }

  const commitSha = commitResponse.data.sha;
  const treeSha = commitResponse.data.commit.tree.sha;
  const treeUrl = `https://api.github.com/repos/${repo.owner}/${repo.repo}/git/trees/${treeSha}?recursive=1`;
  const treeResponse = await fetchJson<{
    tree: Array<{ path: string; type: 'blob' | 'tree' }>;
    truncated?: boolean;
  }>(treeUrl, headers, 'tree', { owner: repo.owner, repo: repo.repo, ref });
  if (!treeResponse.ok) {
    return { ok: false, errors: [treeResponse.error] };
  }

  if (treeResponse.data.truncated) {
    return {
      ok: false,
      errors: [
        makeError(
          'E_GITHUB_FETCH_FAILED',
          'GitHub tree listing truncated. Use --subdir to narrow the scope.'
        )
      ]
    };
  }

  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'graphdown-'));
  const cleanup = async () => {
    await fs.rm(rootDir, { recursive: true, force: true });
  };

  try {
    const entries = treeResponse.data.tree.filter((entry) =>
      matchesSubdir(entry.path, normalizedSubdir)
    );

    for (const entry of entries) {
      if (entry.type !== 'tree') continue;
      const relativePath = stripSubdir(entry.path, normalizedSubdir);
      if (!relativePath) continue;
      await fs.mkdir(path.join(rootDir, relativePath), { recursive: true });
    }

    const files = entries.filter(
      (entry) => entry.type === 'blob' && isMarkdownFile(entry.path)
    );

    for (const entry of files) {
      const relativePath = stripSubdir(entry.path, normalizedSubdir);
      if (!relativePath || relativePath.includes('..')) {
        throw makeError(
          'E_GITHUB_FETCH_FAILED',
          `Invalid file path from GitHub: ${entry.path}`
        );
      }
      const filePath = path.join(rootDir, relativePath);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      const rawUrl = `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/${commitSha}/${entry.path}`;
      const rawResponse = await fetchRaw(rawUrl, headers, {
        owner: repo.owner,
        repo: repo.repo,
        ref
      });
      if (!rawResponse.ok) {
        await cleanup();
        return { ok: false, errors: [rawResponse.error] };
      }
      await fs.writeFile(filePath, rawResponse.data);
    }

    return { ok: true, rootDir, cleanup };
  } catch (error) {
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String((error as Error).message)
        : String(error);
    await cleanup();
    if (error && typeof error === 'object' && 'code' in error) {
      return { ok: false, errors: [error as ValidationError] };
    }
    return {
      ok: false,
      errors: [makeError('E_GITHUB_FETCH_FAILED', `GitHub fetch failed: ${message}`)]
    };
  }
}
