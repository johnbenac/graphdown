import { ImportError } from "@graphdown/io";
import type { ImportErrorInfo } from "@graphdown/io";

export type GitHubImportErrorInfo = ImportErrorInfo & { source: "github" };

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
      message: bodyMessage || "GitHub could not find that repository.",
      httpStatus: status
    };
  }

  if (status === 401) {
    return {
      source: "github",
      code: "auth_required",
      message: bodyMessage || "GitHub requires authentication to access this repository.",
      httpStatus: status
    };
  }

  if (isRateLimit(response, bodyMessage)) {
    return {
      source: "github",
      code: "rate_limited",
      message: bodyMessage || "GitHub is rate limiting requests right now.",
      httpStatus: status
    };
  }

  if (status === 403) {
    return {
      source: "github",
      code: "auth_required",
      message: bodyMessage || "GitHub denied access to this repository.",
      httpStatus: status
    };
  }

  return {
    source: "github",
    code: "unknown",
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
