export type ParsedGitHubUrl = {
  owner: string;
  repo: string;
  ref?: string;
  canonicalRepoUrl: string;
};

type ParseResult =
  | { ok: true; value: ParsedGitHubUrl }
  | { ok: false; message: string; hint?: string };

const UNSUPPORTED_SEGMENTS = new Set(["blob", "pull", "pulls", "issues", "compare", "releases"]);

export function parseGitHubUrl(input: string): ParseResult {
  if (!input.trim()) {
    return { ok: false, message: "Enter a GitHub repository URL." };
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return {
      ok: false,
      message: "Enter a full GitHub URL starting with https://github.com/",
      hint: "Example: https://github.com/owner/repo"
    };
  }

  if (url.hostname !== "github.com") {
    return { ok: false, message: "Only github.com repository URLs are supported." };
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length < 2) {
    return { ok: false, message: "GitHub URLs must include an owner and repository name." };
  }

  const owner = segments[0];
  const repoRaw = segments[1];
  const repo = repoRaw.endsWith(".git") ? repoRaw.slice(0, -4) : repoRaw;

  if (!owner || !repo) {
    return { ok: false, message: "GitHub URLs must include an owner and repository name." };
  }

  if (segments.length === 2) {
    return {
      ok: true,
      value: {
        owner,
        repo,
        canonicalRepoUrl: `https://github.com/${owner}/${repo}`
      }
    };
  }

  const action = segments[2];
  if (UNSUPPORTED_SEGMENTS.has(action)) {
    return {
      ok: false,
      message: "Link points to a GitHub page, not a repository root.",
      hint: "Use the main repo URL instead (https://github.com/owner/repo)."
    };
  }

  if (action === "tree") {
    const ref = segments[3];
    if (!ref) {
      return { ok: false, message: "GitHub tree URLs must include a branch or tag." };
    }
    if (segments.length > 4) {
      return {
        ok: false,
        message: "GitHub URLs cannot include a subdirectory path.",
        hint: "Point to the repository root or branch (no extra path)."
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
    message: "GitHub URL must point to a repository root.",
    hint: "Use https://github.com/owner/repo"
  };
}
