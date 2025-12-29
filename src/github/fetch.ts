import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { makeError, ValidationError } from '../core/errors';
import { GitHubRepoRef } from './url';

export type GitHubSnapshotResult =
  | { ok: true; rootDir: string; cleanup: () => Promise<void> }
  | { ok: false; errors: ValidationError[] };

interface GitHubCommitResponse {
  sha: string;
  commit?: { tree?: { sha?: string } };
  tree?: { sha?: string };
}

interface GitHubRepoResponse {
  default_branch?: string;
}

interface GitHubTreeEntry {
  path: string;
  type: string;
}

interface GitHubTreeResponse {
  tree?: GitHubTreeEntry[];
  truncated?: boolean;
}

function isMarkdownFile(pathname: string): boolean {
  return pathname.toLowerCase().endsWith('.md');
}

function normalizeSubdir(input?: string): { ok: true; value?: string } | { ok: false; error: ValidationError } {
  if (!input) {
    return { ok: true };
  }
  const trimmed = input.trim().replace(/\\/g, '/');
  const cleaned = trimmed.replace(/^\/+|\/+$/g, '');
  if (!cleaned) {
    return {
      ok: false,
      error: makeError(
        'E_GITHUB_FETCH_FAILED',
        'Subdirectory must not be empty when provided.'
      )
    };
  }
  const segments = cleaned.split('/').filter(Boolean);
  if (segments.some((segment) => segment === '..')) {
    return {
      ok: false,
      error: makeError(
        'E_GITHUB_FETCH_FAILED',
        'Subdirectory must not contain parent directory traversal segments.'
      )
    };
  }
  return { ok: true, value: segments.join('/') };
}

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key.toLowerCase()] = value;
  });
  return record;
}

function isRateLimited(status: number, headers: Record<string, string>, bodyText: string): boolean {
  if (status === 429) {
    return true;
  }
  if (status !== 403) {
    return false;
  }
  const remaining = headers['x-ratelimit-remaining'];
  if (remaining === '0') {
    return true;
  }
  return bodyText.toLowerCase().includes('rate limit');
}

function rateLimitHint(headers: Record<string, string>): string | undefined {
  const reset = headers['x-ratelimit-reset'];
  if (!reset) {
    return undefined;
  }
  const resetSeconds = Number(reset);
  if (!Number.isFinite(resetSeconds)) {
    return undefined;
  }
  return `Rate limit resets at ${new Date(resetSeconds * 1000).toISOString()}.`;
}

function createHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': 'graphdown',
    Accept: 'application/vnd.github+json'
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function readResponseText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

async function fetchJson(url: string, token?: string): Promise<{
  ok: true;
  data: unknown;
  headers: Record<string, string>;
  status: number;
  bodyText: string;
} | {
  ok: false;
  status: number;
  headers: Record<string, string>;
  bodyText: string;
}> {
  const response = await fetch(url, { headers: createHeaders(token) });
  const bodyText = await readResponseText(response);
  const headers = headersToRecord(response.headers);
  if (!response.ok) {
    return { ok: false, status: response.status, headers, bodyText };
  }
  let data: unknown = null;
  if (bodyText) {
    try {
      data = JSON.parse(bodyText);
    } catch {
      data = null;
    }
  }
  return { ok: true, data, headers, status: response.status, bodyText };
}

export async function fetchGitHubSnapshotToTempDir(
  repo: GitHubRepoRef,
  opts?: { token?: string }
): Promise<GitHubSnapshotResult> {
  const subdirResult = normalizeSubdir(repo.subdir);
  if (!subdirResult.ok) {
    return { ok: false, errors: [subdirResult.error] };
  }
  const subdir = subdirResult.value;
  const token = opts?.token;
  const repoSlug = `${repo.owner}/${repo.repo}`;

  try {
    const repoResponse = await fetchJson(
      `https://api.github.com/repos/${repoSlug}`,
      token
    );
    if (!repoResponse.ok) {
      const rateLimited = isRateLimited(
        repoResponse.status,
        repoResponse.headers,
        repoResponse.bodyText
      );
      if (repoResponse.status === 404) {
        return {
          ok: false,
          errors: [
            makeError(
              'E_GITHUB_NOT_FOUND',
              `GitHub repository not found: ${repoSlug}`
            )
          ]
        };
      }
      if (rateLimited) {
        const hint = rateLimitHint(repoResponse.headers);
        return {
          ok: false,
          errors: [
            makeError(
              'E_GITHUB_RATE_LIMITED',
              'GitHub API rate limit exceeded.',
              undefined,
              hint
            )
          ]
        };
      }
      if (repoResponse.status === 401 || repoResponse.status === 403) {
        return {
          ok: false,
          errors: [
            makeError(
              'E_GITHUB_AUTH_REQUIRED',
              'GitHub API request was not authorized.'
            )
          ]
        };
      }
      return {
        ok: false,
        errors: [
          makeError(
            'E_GITHUB_FETCH_FAILED',
            `GitHub API request failed (${repoResponse.status}).`
          )
        ]
      };
    }

    const repoData = repoResponse.data as GitHubRepoResponse;
    const defaultBranch = repoData?.default_branch;
    const ref = repo.ref || defaultBranch;
    if (!ref) {
      return {
        ok: false,
        errors: [
          makeError('E_GITHUB_FETCH_FAILED', 'Unable to resolve default branch.')
        ]
      };
    }

    const commitResponse = await fetchJson(
      `https://api.github.com/repos/${repoSlug}/commits/${encodeURIComponent(ref)}`,
      token
    );
    if (!commitResponse.ok) {
      const rateLimited = isRateLimited(
        commitResponse.status,
        commitResponse.headers,
        commitResponse.bodyText
      );
      if (commitResponse.status === 404) {
        return {
          ok: false,
          errors: [
            makeError('E_GITHUB_REF_NOT_FOUND', `GitHub ref not found: ${ref}`)
          ]
        };
      }
      if (rateLimited) {
        const hint = rateLimitHint(commitResponse.headers);
        return {
          ok: false,
          errors: [
            makeError(
              'E_GITHUB_RATE_LIMITED',
              'GitHub API rate limit exceeded.',
              undefined,
              hint
            )
          ]
        };
      }
      if (commitResponse.status === 401 || commitResponse.status === 403) {
        return {
          ok: false,
          errors: [
            makeError(
              'E_GITHUB_AUTH_REQUIRED',
              'GitHub API request was not authorized.'
            )
          ]
        };
      }
      return {
        ok: false,
        errors: [
          makeError(
            'E_GITHUB_FETCH_FAILED',
            `GitHub API request failed (${commitResponse.status}).`
          )
        ]
      };
    }

    const commitData = commitResponse.data as GitHubCommitResponse;
    const commitSha = commitData?.sha;
    const treeSha = commitData?.commit?.tree?.sha ?? commitData?.tree?.sha;
    if (!commitSha || !treeSha) {
      return {
        ok: false,
        errors: [
          makeError(
            'E_GITHUB_FETCH_FAILED',
            `Unable to resolve commit data for ref ${ref}.`
          )
        ]
      };
    }

    const treeResponse = await fetchJson(
      `https://api.github.com/repos/${repoSlug}/git/trees/${treeSha}?recursive=1`,
      token
    );
    if (!treeResponse.ok) {
      const rateLimited = isRateLimited(
        treeResponse.status,
        treeResponse.headers,
        treeResponse.bodyText
      );
      if (rateLimited) {
        const hint = rateLimitHint(treeResponse.headers);
        return {
          ok: false,
          errors: [
            makeError(
              'E_GITHUB_RATE_LIMITED',
              'GitHub API rate limit exceeded.',
              undefined,
              hint
            )
          ]
        };
      }
      if (treeResponse.status === 401 || treeResponse.status === 403) {
        return {
          ok: false,
          errors: [
            makeError(
              'E_GITHUB_AUTH_REQUIRED',
              'GitHub API request was not authorized.'
            )
          ]
        };
      }
      return {
        ok: false,
        errors: [
          makeError(
            'E_GITHUB_FETCH_FAILED',
            `GitHub API request failed (${treeResponse.status}).`
          )
        ]
      };
    }

    const treeData = treeResponse.data as GitHubTreeResponse;
    if (treeData?.truncated) {
      return {
        ok: false,
        errors: [
          makeError(
            'E_GITHUB_FETCH_FAILED',
            'GitHub tree listing was truncated. Use --subdir to narrow the dataset scope.'
          )
        ]
      };
    }

    const treeEntries = Array.isArray(treeData?.tree) ? treeData.tree : [];
    const prefix = subdir ? `${subdir}/` : '';
    const markdownFiles = treeEntries
      .filter((entry) => entry.type === 'blob')
      .map((entry) => entry.path)
      .filter((entryPath) => {
        if (!prefix) {
          return isMarkdownFile(entryPath);
        }
        if (entryPath === subdir) {
          return false;
        }
        if (!entryPath.startsWith(prefix)) {
          return false;
        }
        return isMarkdownFile(entryPath);
      })
      .map((entryPath) => (prefix ? entryPath.slice(prefix.length) : entryPath));

    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'graphdown-'));
    for (const entryPath of markdownFiles) {
      const targetPath = path.join(rootDir, entryPath);
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      const rawUrl = `https://raw.githubusercontent.com/${repoSlug}/${commitSha}/${prefix}${entryPath}`;
      const response = await fetch(rawUrl, { headers: createHeaders(token) });
      if (!response.ok) {
        await fs.rm(rootDir, { recursive: true, force: true });
        return {
          ok: false,
          errors: [
            makeError(
              'E_GITHUB_FETCH_FAILED',
              `Failed to download ${entryPath} from GitHub.`
            )
          ]
        };
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(targetPath, buffer);
    }

    const cleanup = async () => {
      await fs.rm(rootDir, { recursive: true, force: true });
    };

    return { ok: true, rootDir, cleanup };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      errors: [makeError('E_GITHUB_FETCH_FAILED', `GitHub fetch failed: ${message}`)]
    };
  }
}
