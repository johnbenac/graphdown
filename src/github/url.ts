import { ValidationError, makeError } from '../core/errors';

export interface GitHubRepoRef {
  owner: string;
  repo: string;
  ref?: string;
  subdir?: string;
}

export function normalizeGitHubSubdir(
  input?: string
): { ok: true; value?: string } | { ok: false; error: ValidationError } {
  if (!input) {
    return { ok: true, value: undefined };
  }
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: true, value: undefined };
  }
  const normalized = trimmed.replace(/^\/+|\/+$/g, '');
  if (!normalized) {
    return { ok: true, value: undefined };
  }
  const segments = normalized.split('/').filter(Boolean);
  if (segments.some((segment) => segment === '..')) {
    return {
      ok: false,
      error: makeError(
        'E_GITHUB_URL_INVALID_FORMAT',
        'GitHub subdir must not include .. traversal segments.'
      )
    };
  }
  return { ok: true, value: segments.join('/') };
}

function invalidFormat(message: string): { ok: false; error: ValidationError } {
  return {
    ok: false,
    error: makeError('E_GITHUB_URL_INVALID_FORMAT', message)
  };
}

export function parseGitHubRepoUrl(
  input: string
): { ok: true; value: GitHubRepoRef } | { ok: false; error: ValidationError } {
  if (!input || !input.trim()) {
    return invalidFormat('GitHub URL is required.');
  }
  const stripped = input.trim().split(/[?#]/)[0].replace(/\/+$/g, '');
  if (!stripped) {
    return invalidFormat('GitHub URL is required.');
  }
  let pathPart: string;
  if (/^https?:\/\//i.test(stripped)) {
    let url: URL;
    try {
      url = new URL(stripped);
    } catch (error) {
      return invalidFormat('GitHub URL has an invalid format.');
    }
    if (url.hostname.toLowerCase() !== 'github.com') {
      return invalidFormat('GitHub URL must use the github.com host.');
    }
    pathPart = stripped.replace(/^https?:\/\/github\.com/i, '');
  } else if (/^github\.com\//i.test(stripped)) {
    pathPart = stripped.replace(/^github\.com/i, '');
  } else {
    return invalidFormat('GitHub URL must start with github.com or https://github.com.');
  }

  const segments = pathPart.split('/').filter(Boolean);
  if (segments.length < 2) {
    return invalidFormat('GitHub URL must include an owner and repository.');
  }

  const owner = segments[0];
  let repo = segments[1];
  if (repo.toLowerCase().endsWith('.git')) {
    repo = repo.slice(0, -4);
  }
  if (!owner || !repo) {
    return invalidFormat('GitHub URL must include an owner and repository.');
  }

  if (segments.length === 2) {
    return { ok: true, value: { owner, repo } };
  }

  if (segments[2] !== 'tree') {
    return invalidFormat('GitHub URL can only include /tree/<ref> for subdirectories.');
  }
  if (segments.length < 4) {
    return invalidFormat('GitHub tree URL must include a ref after /tree/.');
  }
  const ref = segments[3];
  const subdirCandidate = segments.slice(4).join('/');
  const normalized = normalizeGitHubSubdir(subdirCandidate);
  if (!normalized.ok) {
    return normalized;
  }

  const value: GitHubRepoRef = {
    owner,
    repo,
    ref,
    subdir: normalized.value
  };
  return { ok: true, value };
}
