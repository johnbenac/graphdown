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

const formatError = (input: string): ParseResult => ({
  ok: false,
  error: makeError('E_GITHUB_URL_INVALID_FORMAT', `Invalid GitHub URL: ${input}`)
});

function stripQueryHash(input: string): string {
  return input.split(/[?#]/)[0];
}

function hasEmptySegment(segments: string[]): boolean {
  return segments.some((segment) => segment.length === 0);
}

function normalizeSubdir(subdir: string | undefined): string | undefined {
  if (!subdir) return undefined;
  const trimmed = subdir.replace(/^\/+|\/+$/g, '');
  if (!trimmed) return undefined;
  const segments = trimmed.split('/');
  if (hasEmptySegment(segments)) return undefined;
  if (segments.some((segment) => segment === '..')) return undefined;
  return segments.join('/');
}

export function parseGitHubRepoUrl(input: string): ParseResult {
  const cleaned = stripQueryHash(input.trim()).replace(/\/+$/, '');
  if (!cleaned) {
    return formatError(input);
  }

  let host: string | null = null;
  let pathname: string | null = null;

  if (/^https?:\/\//i.test(cleaned)) {
    const match = cleaned.match(/^https?:\/\/([^/]+)\/(.+)$/i);
    if (!match) {
      return formatError(input);
    }
    host = match[1].toLowerCase();
    pathname = `/${match[2]}`;
  } else {
    const match = cleaned.match(/^(github\.com)\/(.+)$/i);
    if (!match) {
      return formatError(input);
    }
    host = match[1].toLowerCase();
    pathname = `/${match[2]}`;
  }

  if (host !== 'github.com' || !pathname) {
    return formatError(input);
  }

  const segments = pathname.replace(/^\/+/, '').split('/');
  if (hasEmptySegment(segments)) {
    return formatError(input);
  }
  if (segments.length < 2) {
    return formatError(input);
  }

  const [owner, repoRaw, ...rest] = segments;
  const repo = repoRaw.replace(/\.git$/i, '');
  if (!owner || !repo) {
    return formatError(input);
  }

  if (rest.length === 0) {
    return { ok: true, value: { owner, repo } };
  }

  if (rest[0] !== 'tree') {
    return formatError(input);
  }

  if (rest.length < 2) {
    return formatError(input);
  }

  const [_, ref, ...subdirParts] = rest;
  if (!ref) {
    return formatError(input);
  }

  const subdir = normalizeSubdir(subdirParts.join('/'));
  if (subdirParts.length > 0 && !subdir) {
    return formatError(input);
  }

  const value: GitHubRepoRef = { owner, repo, ref };
  if (subdir) {
    value.subdir = subdir;
  }
  return { ok: true, value };
}
