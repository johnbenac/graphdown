export type ParsedGitHubUrl = {
  owner: string;
  repo: string;
  ref?: string;
  canonicalRepoUrl: string;
};

export type ParseGitHubUrlResult =
  | { ok: true; value: ParsedGitHubUrl }
  | { ok: false; message: string; hint?: string };

const UNSUPPORTED_PATHS = new Set(["blob", "pull", "issues", "pulls", "commits"]);

export function parseGitHubUrl(input: string): ParseGitHubUrlResult {
  if (!input.trim()) {
    return { ok: false, message: "Enter a GitHub repository URL." };
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return {
      ok: false,
      message: "That does not look like a valid URL.",
      hint: "Paste a full GitHub URL like https://github.com/owner/repo."
    };
  }

  if (url.hostname !== "github.com") {
    return { ok: false, message: "Only github.com URLs are supported right now." };
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) {
    return { ok: false, message: "GitHub repository URLs must include an owner and repo." };
  }

  const owner = parts[0];
  let repo = parts[1];
  if (repo.endsWith(".git")) {
    repo = repo.slice(0, -4);
  }

  if (!owner || !repo) {
    return { ok: false, message: "GitHub repository URLs must include an owner and repo." };
  }

  if (parts.length > 2) {
    const sub = parts[2];
    if (UNSUPPORTED_PATHS.has(sub)) {
      return {
        ok: false,
        message: "This URL points to a GitHub page, not a repository root.",
        hint: "Use the repository root URL instead (https://github.com/owner/repo)."
      };
    }
    if (sub === "tree") {
      const ref = parts[3];
      if (!ref) {
        return { ok: false, message: "Tree URLs must include a branch or tag name." };
      }
      if (parts.length > 4) {
        return {
          ok: false,
          message: "Subdirectory imports are not supported yet.",
          hint: "Point to the repo root or a branch without a path."
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
      message: "This URL points to a GitHub page, not a repository root.",
      hint: "Use the repository root URL instead (https://github.com/owner/repo)."
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
