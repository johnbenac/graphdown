import type { ImportErrorInfo } from "@graphdown/io";
import { ImportError } from "@graphdown/io";

export type GitHubImportErrorInfo = ImportErrorInfo & {
  source: "github";
  title?: string;
  hint?: string;
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
      source: "github",
      code: "not_found",
      title: "Repository not found",
      message: bodyMessage || "GitHub could not find that repository.",
      httpStatus: status
    };
  }

  if (status === 401) {
    return {
      source: "github",
      code: "auth_required",
      title: "Authentication required",
      message: bodyMessage || "GitHub requires authentication to access this repository.",
      hint: "This repository may be private. Graphdown currently imports public repositories only.",
      httpStatus: status
    };
  }

  if (isRateLimit(response, bodyMessage)) {
    return {
      source: "github",
      code: "rate_limited",
      title: "GitHub rate limit exceeded",
      message: bodyMessage || "GitHub is rate limiting requests right now.",
      hint: "Wait a few minutes and try again. Unauthenticated GitHub API imports have low rate limits.",
      httpStatus: status
    };
  }

  return {
    source: "github",
    code: "unknown",
    title: "GitHub error",
    message: bodyMessage || `GitHub returned status ${status}.`,
    httpStatus: status
  };
}

export class GitHubImportError extends ImportError {
  constructor(info: GitHubImportErrorInfo) {
    super(info);
    this.name = "GitHubImportError";
  }
}
