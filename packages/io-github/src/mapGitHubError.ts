import type { ImportErrorInfo } from "@graphdown/io";
import { ImportError } from "@graphdown/io";

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

function parseRetryAfterSeconds(response: Response): number | undefined {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const asInt = Number.parseInt(retryAfter, 10);
    if (Number.isFinite(asInt) && asInt > 0) {
      return asInt;
    }

    const asDateMs = Date.parse(retryAfter);
    if (!Number.isNaN(asDateMs)) {
      const deltaMs = asDateMs - Date.now();
      const seconds = Math.ceil(deltaMs / 1000);
      return seconds > 0 ? seconds : undefined;
    }
  }

  const reset = response.headers.get("x-ratelimit-reset");
  if (reset) {
    const resetSec = Number.parseInt(reset, 10);
    if (Number.isFinite(resetSec) && resetSec > 0) {
      const nowSec = Math.floor(Date.now() / 1000);
      const seconds = resetSec - nowSec;
      return seconds > 0 ? seconds : undefined;
    }
  }

  return undefined;
}

export function mapGitHubError(response: Response, bodyMessage?: string | null): GitHubImportErrorInfo {
  const status = response.status;
  const message = bodyMessage || `GitHub returned status ${status}.`;

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
    const retryAfterSeconds = parseRetryAfterSeconds(response);

    return {
      source: "github",
      code: "rate_limited",
      message: bodyMessage || "GitHub is rate limiting requests right now.",
      httpStatus: status,
      ...(retryAfterSeconds !== undefined ? { retryAfterSeconds } : {})
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
    message,
    httpStatus: status
  };
}

export class GitHubImportError extends ImportError {
  constructor(info: GitHubImportErrorInfo) {
    super(info);
    this.name = "GitHubImportError";
  }
}
