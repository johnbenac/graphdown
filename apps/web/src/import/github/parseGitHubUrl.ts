export type ParsedGitHubUrl = {
  owner: string;
  repo: string;
  ref?: string;
  canonicalRepoUrl: string;
};

type ParseResult =
  | { ok: true; value: ParsedGitHubUrl }
  | { ok: false; message: string; hint?: string };

const INVALID_PATH_PREFIXES = ['blob', 'pull', 'issues', 'compare', 'releases', 'actions', 'wiki'];

export function parseGitHubUrl(input: string): ParseResult {
  if (!input.trim()) {
    return { ok: false, message: 'Enter a GitHub repository URL.' };
  }

  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return {
      ok: false,
      message: 'That does not look like a valid URL.',
      hint: 'Use a full GitHub URL like https://github.com/owner/repo.'
    };
  }

  if (url.hostname !== 'github.com') {
    return { ok: false, message: 'Only github.com URLs are supported.' };
  }

  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length < 2) {
    return { ok: false, message: 'Missing repository owner or name.' };
  }

  const [owner, repoRaw, maybeTree, maybeRef, ...rest] = segments;
  if (!owner || !repoRaw) {
    return { ok: false, message: 'Missing repository owner or name.' };
  }

  const repo = repoRaw.endsWith('.git') ? repoRaw.slice(0, -4) : repoRaw;
  if (!repo) {
    return { ok: false, message: 'Missing repository name.' };
  }

  if (maybeTree && INVALID_PATH_PREFIXES.includes(maybeTree)) {
    return { ok: false, message: 'URL must point to a repository, not a file or issue.' };
  }

  let ref: string | undefined;
  if (maybeTree) {
    if (maybeTree !== 'tree') {
      return { ok: false, message: 'Unsupported GitHub URL path.' };
    }
    if (!maybeRef) {
      return { ok: false, message: 'Branch or tag missing in URL.' };
    }
    if (rest.length > 0) {
      return {
        ok: false,
        message: 'Subdirectory imports are not supported.',
        hint: 'Point at the repository root or a branch.'
      };
    }
    ref = maybeRef;
  }

  const canonicalRepoUrl = `https://github.com/${owner}/${repo}`;
  return { ok: true, value: { owner, repo, ref, canonicalRepoUrl } };
}
