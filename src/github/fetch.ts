import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { makeError, ValidationError } from '../core/errors';
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

interface GitHubCommitResponse {
  sha: string;
  commit?: {
    tree?: {
      sha?: string;
    };
  };
  tree?: {
    sha?: string;
  };
}

interface GitHubRepoResponse {
  default_branch?: string;
}

interface GitHubTreeEntry {
  path: string;
  type: string;
}

interface GitHubTreeResponse {
  truncated?: boolean;
  tree?: GitHubTreeEntry[];
}

function buildHeaders(token?: string): HeadersInit {
  const headers: Record<string, string> = {
    'User-Agent': 'graphdown',
    Accept: 'application/vnd.github+json'
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function classifyRateLimit(response: Response, bodyText: string): boolean {
  if (response.status === 429) {
    return true;
  }
  if (response.status === 403) {
    const remaining = response.headers.get('x-ratelimit-remaining');
    if (remaining === '0') {
      return true;
    }
    if (bodyText.toLowerCase().includes('rate limit')) {
      return true;
    }
  }
  return false;
}

function rateLimitHint(response: Response): string | undefined {
  const reset = response.headers.get('x-ratelimit-reset');
  if (!reset) {
    return undefined;
  }
  const resetSeconds = Number(reset);
  if (Number.isNaN(resetSeconds)) {
    return undefined;
  }
  const resetDate = new Date(resetSeconds * 1000).toISOString();
  return `Rate limit resets at ${resetDate}.`;
}

async function buildGitHubError(
  response: Response,
  context: 'repo' | 'commit' | 'tree' | 'raw'
): Promise<ValidationError> {
  const bodyText = await response.text();
  if (classifyRateLimit(response, bodyText)) {
    return makeError(
      'E_GITHUB_RATE_LIMITED',
      'GitHub API rate limit exceeded.',
      undefined,
      rateLimitHint(response)
    );
  }
  if (response.status === 401 || response.status === 403) {
    return makeError('E_GITHUB_AUTH_REQUIRED', 'GitHub authentication required.');
  }
  if (response.status === 404) {
    if (context === 'repo') {
      return makeError('E_GITHUB_NOT_FOUND', 'GitHub repository not found.');
    }
    if (context === 'commit') {
      return makeError('E_GITHUB_REF_NOT_FOUND', 'GitHub ref was not found.');
    }
    return makeError('E_GITHUB_FETCH_FAILED', 'GitHub content not found.');
  }
  return makeError(
    'E_GITHUB_FETCH_FAILED',
    `GitHub request failed with status ${response.status}.`
  );
}

async function fetchJson<T>(
  url: string,
  context: 'repo' | 'commit' | 'tree',
  token?: string
): Promise<{ ok: true; data: T } | { ok: false; error: ValidationError }> {
  let response: Response;
  try {
    response = await fetch(url, { headers: buildHeaders(token) });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: makeError('E_GITHUB_FETCH_FAILED', `GitHub request failed: ${message}.`)
    };
  }
  if (!response.ok) {
    return { ok: false, error: await buildGitHubError(response, context) };
  }
  const data = (await response.json()) as T;
  return { ok: true, data };
}

async function fetchRawFile(
  url: string,
  token?: string
): Promise<{ ok: true; content: string } | { ok: false; error: ValidationError }> {
  let response: Response;
  try {
    response = await fetch(url, { headers: buildHeaders(token) });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: makeError('E_GITHUB_FETCH_FAILED', `GitHub request failed: ${message}.`)
    };
  }
  if (!response.ok) {
    return { ok: false, error: await buildGitHubError(response, 'raw') };
  }
  const content = await response.text();
  return { ok: true, content };
}

export async function fetchGitHubSnapshotToTempDir(
  repo: GitHubRepoRef,
  opts?: { token?: string }
): Promise<GitHubSnapshotResult> {
  const normalizedSubdir = normalizeGitHubSubdir(repo.subdir);
  if (!normalizedSubdir.ok) {
    return { ok: false, errors: [normalizedSubdir.error] };
  }
  const subdir = normalizedSubdir.value;

  const repoUrl = `https://api.github.com/repos/${repo.owner}/${repo.repo}`;
  const repoResponse = await fetchJson<GitHubRepoResponse>(
    repoUrl,
    'repo',
    opts?.token
  );
  if (!repoResponse.ok) {
    return { ok: false, errors: [repoResponse.error] };
  }
  const defaultBranch = repoResponse.data.default_branch;
  const ref = repo.ref || defaultBranch;
  if (!ref) {
    return {
      ok: false,
      errors: [makeError('E_GITHUB_FETCH_FAILED', 'GitHub default branch not found.')]
    };
  }

  const commitUrl = `https://api.github.com/repos/${repo.owner}/${repo.repo}/commits/${encodeURIComponent(
    ref
  )}`;
  const commitResponse = await fetchJson<GitHubCommitResponse>(
    commitUrl,
    'commit',
    opts?.token
  );
  if (!commitResponse.ok) {
    return { ok: false, errors: [commitResponse.error] };
  }

  const commitSha = commitResponse.data.sha;
  const treeSha =
    commitResponse.data.commit?.tree?.sha ?? commitResponse.data.tree?.sha;
  if (!commitSha || !treeSha) {
    return {
      ok: false,
      errors: [makeError('E_GITHUB_FETCH_FAILED', 'GitHub commit data missing tree SHA.')]
    };
  }

  const treeUrl = `https://api.github.com/repos/${repo.owner}/${repo.repo}/git/trees/${treeSha}?recursive=1`;
  const treeResponse = await fetchJson<GitHubTreeResponse>(
    treeUrl,
    'tree',
    opts?.token
  );
  if (!treeResponse.ok) {
    return { ok: false, errors: [treeResponse.error] };
  }

  if (treeResponse.data.truncated) {
    return {
      ok: false,
      errors: [
        makeError(
          'E_GITHUB_FETCH_FAILED',
          'GitHub tree listing was truncated.',
          undefined,
          'Use --subdir to limit the dataset scope.'
        )
      ]
    };
  }

  const entries = treeResponse.data.tree ?? [];
  const markdownEntries = entries.filter((entry) => {
    if (entry.type !== 'blob') {
      return false;
    }
    if (!entry.path.toLowerCase().endsWith('.md')) {
      return false;
    }
    if (!subdir) {
      return true;
    }
    if (entry.path === subdir) {
      return true;
    }
    return entry.path.startsWith(`${subdir}/`);
  });

  let rootDir: string | undefined;
  const cleanup = async () => {
    if (rootDir) {
      await fs.rm(rootDir, { recursive: true, force: true });
    }
  };

  try {
    rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'graphdown-'));
    for (const entry of markdownEntries) {
      let relativePath = entry.path;
      if (subdir) {
        if (entry.path === subdir) {
          relativePath = path.posix.basename(entry.path);
        } else if (entry.path.startsWith(`${subdir}/`)) {
          relativePath = entry.path.slice(subdir.length + 1);
        }
      }
      if (!relativePath) {
        continue;
      }
      const targetPath = path.join(rootDir, relativePath);
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      const rawUrl = `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/${commitSha}/${entry.path}`;
      const rawResponse = await fetchRawFile(rawUrl, opts?.token);
      if (!rawResponse.ok) {
        await cleanup();
        return { ok: false, errors: [rawResponse.error] };
      }
      await fs.writeFile(targetPath, rawResponse.content, 'utf8');
    }

    return {
      ok: true,
      rootDir,
      cleanup
    };
  } catch (error) {
    await cleanup();
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      errors: [makeError('E_GITHUB_FETCH_FAILED', `Failed to write snapshot: ${message}.`)]
    };
  }
}
