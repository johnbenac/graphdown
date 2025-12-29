import { makeError, ValidationError } from '../core/errors';

export interface GitHubRepoRef {
  owner: string;
  repo: string;
  ref?: string;
  subdir?: string;
}

type ParseResult =
  | { ok: true; value: GitHubRepoRef }
  | { ok: false; error: ValidationError };

function invalidFormat(input: string): ParseResult {
  return {
    ok: false,
    error: makeError(
      'E_GITHUB_URL_INVALID_FORMAT',
      `Unsupported GitHub URL format: ${input}`
    )
  };
}

function stripSuffix(value: string, suffix: string): string {
  return value.endsWith(suffix) ? value.slice(0, -suffix.length) : value;
}

function isTraversalSegment(segment: string): boolean {
  return segment === '..';
}

export function parseGitHubRepoUrl(input: string): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return invalidFormat(input);
  }

  const normalizedInput = trimmed.split('#')[0].split('?')[0];
  let hostAndPath = normalizedInput;
  if (/^https?:\/\//i.test(normalizedInput)) {
    const withoutScheme = normalizedInput.replace(/^https?:\/\//i, '');
    if (/^www\.github\.com\//i.test(withoutScheme)) {
      hostAndPath = withoutScheme.slice('www.github.com'.length);
    } else if (/^github\.com\//i.test(withoutScheme)) {
      hostAndPath = withoutScheme.slice('github.com'.length);
    } else {
      return invalidFormat(input);
    }
  } else if (/^github\.com\//i.test(normalizedInput)) {
    hostAndPath = normalizedInput.slice('github.com'.length);
  } else {
    return invalidFormat(input);
  }

  const cleanedPath = stripSuffix(hostAndPath, '/').replace(/^\/+/, '');
  if (!cleanedPath) {
    return invalidFormat(input);
  }

  const parts = cleanedPath.split('/').filter(Boolean);
  if (parts.length < 2) {
    return invalidFormat(input);
  }

  const [owner, rawRepo, ...rest] = parts;
  if (!owner || !rawRepo) {
    return invalidFormat(input);
  }

  const repo = stripSuffix(rawRepo, '.git');
  if (!repo) {
    return invalidFormat(input);
  }

  if (rest.length === 0) {
    return { ok: true, value: { owner, repo } };
  }

  if (rest[0] !== 'tree') {
    return invalidFormat(input);
  }

  if (rest.length < 2) {
    return invalidFormat(input);
  }

  const ref = rest[1];
  const subdirParts = rest.slice(2);
  if (!ref) {
    return invalidFormat(input);
  }

  if (subdirParts.some(isTraversalSegment)) {
    return invalidFormat(input);
  }

  const subdir = subdirParts.length > 0 ? subdirParts.join('/') : undefined;

  const value: GitHubRepoRef = { owner, repo };
  if (ref) {
    value.ref = ref;
  }
  if (subdir) {
    value.subdir = subdir;
  }

  return { ok: true, value };
}
