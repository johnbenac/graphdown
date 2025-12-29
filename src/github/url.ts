import { ValidationError, makeError } from '../core/errors';

export interface GitHubRepoRef {
  owner: string;
  repo: string;
  ref?: string;
  subdir?: string;
}

function normalizeSubdirValue(
  subdir?: string
): { ok: true; value?: string } | { ok: false; error: ValidationError } {
  if (!subdir) {
    return { ok: true, value: undefined };
  }
  const trimmed = subdir.replace(/^\/+|\/+$/g, '');
  if (!trimmed) {
    return {
      ok: false,
      error: makeError(
        'E_GITHUB_URL_INVALID_FORMAT',
        'GitHub URL subdir must not be empty.'
      )
    };
  }
  const segments = trimmed.split('/');
  if (segments.some((segment) => segment === '..')) {
    return {
      ok: false,
      error: makeError(
        'E_GITHUB_URL_INVALID_FORMAT',
        'GitHub URL subdir must not contain ".." segments.'
      )
    };
  }
  return { ok: true, value: trimmed };
}

function buildInvalidUrlError(input: string): ValidationError {
  return makeError(
    'E_GITHUB_URL_INVALID_FORMAT',
    `Invalid GitHub URL: ${input}`
  );
}

export function normalizeGitHubSubdir(
  subdir?: string
): { ok: true; value?: string } | { ok: false; error: ValidationError } {
  return normalizeSubdirValue(subdir);
}

export function parseGitHubRepoUrl(
  input: string
): { ok: true; value: GitHubRepoRef } | { ok: false; error: ValidationError } {
  const trimmedInput = input.trim();
  if (!trimmedInput) {
    return { ok: false, error: buildInvalidUrlError(input) };
  }

  const withoutQuery = trimmedInput.split(/[?#]/)[0];
  let rawPath = '';

  if (/^https?:\/\//i.test(withoutQuery)) {
    const match = withoutQuery.match(/^https?:\/\/([^/]+)(\/.*)?$/i);
    if (!match) {
      return { ok: false, error: buildInvalidUrlError(input) };
    }
    const host = match[1];
    if (host.toLowerCase() !== 'github.com') {
      return { ok: false, error: buildInvalidUrlError(input) };
    }
    rawPath = match[2] ?? '';
  } else if (/^github\.com\//i.test(withoutQuery)) {
    rawPath = withoutQuery.replace(/^github\.com/i, '');
  } else {
    return { ok: false, error: buildInvalidUrlError(input) };
  }

  rawPath = rawPath.replace(/\/+$/, '');
  const segments = rawPath.split('/').filter(Boolean);
  if (segments.length < 2) {
    return { ok: false, error: buildInvalidUrlError(input) };
  }

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/i, '');
  if (!owner || !repo) {
    return { ok: false, error: buildInvalidUrlError(input) };
  }

  if (segments.length === 2) {
    return { ok: true, value: { owner, repo } };
  }

  if (segments[2] !== 'tree') {
    return { ok: false, error: buildInvalidUrlError(input) };
  }

  if (segments.length < 4) {
    return { ok: false, error: buildInvalidUrlError(input) };
  }

  const ref = segments[3];
  const subdirSegments = segments.slice(4);
  const subdir = subdirSegments.length ? subdirSegments.join('/') : undefined;
  const normalizedSubdir = normalizeSubdirValue(subdir);
  if (!normalizedSubdir.ok) {
    return { ok: false, error: normalizedSubdir.error };
  }

  const value: GitHubRepoRef = { owner, repo, ref };
  if (normalizedSubdir.value) {
    value.subdir = normalizedSubdir.value;
  }
  return { ok: true, value };
}
