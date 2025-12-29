type MapGitHubErrorInput = {
  status: number;
  headers?: Headers;
  message?: string;
};

type MappedGitHubError = {
  category: "not_found" | "auth_required" | "rate_limited" | "network" | "unknown";
  title: string;
  message: string;
  hint?: string;
  status?: number;
};

function isRateLimited(input: MapGitHubErrorInput): boolean {
  if (input.status === 429) {
    return true;
  }
  const remaining = input.headers?.get("x-ratelimit-remaining");
  if (remaining === "0") {
    return true;
  }
  return Boolean(input.message?.toLowerCase().includes("rate limit"));
}

export function mapGitHubError(input: MapGitHubErrorInput): MappedGitHubError {
  const status = input.status;
  if (status === 404) {
    return {
      category: "not_found",
      title: "Repository not found",
      message: "GitHub could not find that repository.",
      hint: "Double-check the URL and that the repo is public.",
      status
    };
  }
  if (status === 401) {
    return {
      category: "auth_required",
      title: "Authentication required",
      message: "GitHub requires authentication for this repository.",
      hint: "Try a public repository or authenticate in a future release.",
      status
    };
  }
  if (status === 403) {
    if (isRateLimited(input)) {
      return {
        category: "rate_limited",
        title: "GitHub rate limit reached",
        message: "GitHub API rate limit was exhausted.",
        hint: "Wait a few minutes and try again.",
        status
      };
    }
    return {
      category: "auth_required",
      title: "Authentication required",
      message: "GitHub denied access to that repository.",
      hint: "Try a public repository or authenticate in a future release.",
      status
    };
  }
  if (status === 429) {
    return {
      category: "rate_limited",
      title: "GitHub rate limit reached",
      message: "GitHub API rate limit was exhausted.",
      hint: "Wait a few minutes and try again.",
      status
    };
  }
  return {
    category: "unknown",
    title: "GitHub import failed",
    message: input.message ?? "GitHub returned an unexpected response.",
    status
  };
}
