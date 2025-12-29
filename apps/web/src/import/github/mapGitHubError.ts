export type GitHubImportErrorInfo = {
  category: "not_found" | "auth_required" | "rate_limited" | "unknown";
  title: string;
  message: string;
  hint?: string;
  status?: number;
};

function isRateLimit(response: Response, message?: string | null): boolean {
  if (response.status === 429) {
    return true;
  }
  if (response.status !== 403) {
    return false;
  }
  const remaining = response.headers.get("x-ratelimit-remaining");
  if (remaining === "0") {
    return true;
  }
  return Boolean(message && message.toLowerCase().includes("rate limit"));
}

export function mapGitHubError(response: Response, bodyMessage?: string | null): GitHubImportErrorInfo {
  const status = response.status;

  if (status === 404) {
    return {
      category: "not_found",
      title: "Repository not found",
      message: bodyMessage || "GitHub could not find that repository.",
      status
    };
  }

  if (status === 401) {
    return {
      category: "auth_required",
      title: "Authentication required",
      message: bodyMessage || "GitHub requires authentication to access this repository.",
      hint: "Try a public repository or authenticate with a GitHub token.",
      status
    };
  }

  if (isRateLimit(response, bodyMessage)) {
    return {
      category: "rate_limited",
      title: "GitHub rate limit exceeded",
      message: bodyMessage || "GitHub is rate limiting requests right now.",
      hint: "Wait a few minutes and try again, or authenticate to raise your limit.",
      status
    };
  }

  if (status === 403) {
    return {
      category: "auth_required",
      title: "Authentication required",
      message: bodyMessage || "GitHub denied access to this repository.",
      hint: "The repo may be private or require authentication.",
      status
    };
  }

  return {
    category: "unknown",
    title: "GitHub error",
    message: bodyMessage || `GitHub returned status ${status}.`,
    status
  };
}

export class GitHubImportError extends Error {
  info: GitHubImportErrorInfo;

  constructor(info: GitHubImportErrorInfo) {
    super(info.message);
    this.name = "GitHubImportError";
    this.info = info;
  }
}
