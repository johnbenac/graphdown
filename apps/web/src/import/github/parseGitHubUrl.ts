export type ParsedGitHubUrl = {
  owner: string;
  repo: string;
  ref?: string;
  canonicalRepoUrl: string;
};

type ParseResult =
  | { ok: true; value: ParsedGitHubUrl }
  | { ok: false; message: string; hint?: string };

const UNSUPPORTED_SEGMENTS = new Set([
  'blob',
  'pull',
  'issues',
  'compare',
  'commit',
  'commits',
  'releases',
  'actions',
  'wiki',
  'settings'
]);

export function parseGitHubUrl(input: string): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, message: 'Enter a GitHub repository URL.' };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return {
      ok: false,
      message: 'GitHub URL must include the full https://github.com/owner/repo format.',
      hint: 'Example: https://github.com/owner/repo'
    };
  }

  if (url.hostname !== 'github.com') {
    return { ok: false, message: 'Only github.com URLs are supported.' };
  }

  const path = url.pathname.replace(/^\/+|\/+$/g, '');
  if (!path) {
    return { ok: false, message: 'GitHub URL must include an owner and repo.' };
  }

  const segments = path.split('/');
  if (segments.length < 2) {
    return { ok: false, message: 'GitHub URL must include an owner and repo.' };
  }

  const owner = segments[0];
  let repo = segments[1];
  if (!owner || !repo) {
    return { ok: false, message: 'GitHub URL must include an owner and repo.' };
  }

  if (repo.endsWith('.git')) {
    repo = repo.slice(0, -4);
  }

  if (!repo) {
    return { ok: false, message: 'GitHub URL must include a repository name.' };
  }

  if (segments.length > 2) {
    const sub = segments[2];
    if (UNSUPPORTED_SEGMENTS.has(sub)) {
      return {
        ok: false,
        message: 'GitHub URL must point to a repository, not a file or issue view.'
      };
    }
    if (sub === 'tree') {
      const ref = segments[3];
      if (!ref) {
        return { ok: false, message: 'GitHub URL is missing the branch or tag after /tree/.' };
      }
      if (segments.length > 4) {
        return {
          ok: false,
          message: 'GitHub URL cannot include a subdirectory path. Use the repo root.'
        };
      }
      return {
        ok: true,
        value: {
          owner,
          repo,
          ref,
          canonicalRepoUrl: `https://github.com/${owner}/${repo}`
        }
      };
    }

    return {
      ok: false,
      message: 'GitHub URL must point to the repository root or a /tree/<ref> branch view.'
    };
  }

  return {
    ok: true,
    value: {
      owner,
      repo,
      canonicalRepoUrl: `https://github.com/${owner}/${repo}`
    }
  };
}
