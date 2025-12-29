import type { ImportErrorState } from "../../state/importTypes";

type GitHubErrorInput = {
  status: number;
  headers: Headers;
  message?: string;
};

export function mapGitHubError(input: GitHubErrorInput): ImportErrorState {
  const message = input.message ?? "GitHub request failed.";
  const lowerMessage = message.toLowerCase();
  const remaining = input.headers.get("x-ratelimit-remaining");
  const isRateLimited =
    input.status === 429 ||
    (input.status === 403 && (remaining === "0" || lowerMessage.includes("rate limit")));

  if (input.status === 404) {
    return {
      category: "not_found",
      title: "Repository not found",
      message: "GitHub returned a 404 for that repository.",
      status: input.status
    };
  }

  if (input.status === 401) {
    return {
      category: "auth_required",
      title: "Authentication required",
      message: "GitHub rejected the request. Authentication may be required.",
      status: input.status
    };
  }

  if (isRateLimited) {
    return {
      category: "rate_limited",
      title: "Rate limit exceeded",
      message: "GitHub rate limit exceeded. Try again later.",
      status: input.status,
      hint: "Use an authenticated request or wait for the limit to reset."
    };
  }

  if (input.status === 403) {
    return {
      category: "auth_required",
      title: "Access denied",
      message: "GitHub blocked the request. Authentication may be required.",
      status: input.status
    };
  }

  return {
    category: "unknown",
    title: "GitHub request failed",
    message,
    status: input.status
  };
}
