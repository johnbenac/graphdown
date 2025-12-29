import type { ImportErrorState } from "../../state/DatasetContext";

export function mapGitHubError(options: {
  status: number;
  headers: Headers;
  message?: string;
  title?: string;
}): ImportErrorState {
  const { status, headers, message, title } = options;
  const lowerMessage = message?.toLowerCase() ?? "";
  const rateRemaining = headers.get("x-ratelimit-remaining");

  if (status === 404) {
    return {
      category: "not_found",
      title: title ?? "Repository not found",
      message: message ?? "We could not find that repository."
    };
  }

  if (status === 401) {
    return {
      category: "auth_required",
      title: title ?? "Authentication required",
      message: message ?? "GitHub requires authentication to access this repository."
    };
  }

  if (status === 429 || lowerMessage.includes("rate limit") || rateRemaining === "0") {
    return {
      category: "rate_limited",
      title: title ?? "Rate limit exceeded",
      message: message ?? "GitHub rate limit exceeded. Please try again later.",
      status
    };
  }

  if (status === 403) {
    return {
      category: "auth_required",
      title: title ?? "Authentication required",
      message: message ?? "Access to this repository requires authentication.",
      status
    };
  }

  return {
    category: "unknown",
    title: title ?? "GitHub request failed",
    message: message ?? "GitHub returned an unexpected response.",
    status
  };
}
