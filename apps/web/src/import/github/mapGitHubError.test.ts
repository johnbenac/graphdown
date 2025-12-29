import { describe, expect, it } from "vitest";
import { mapGitHubError } from "./mapGitHubError";

function makeHeaders(values: Record<string, string>) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(values)) {
    headers.set(key, value);
  }
  return headers;
}

describe("mapGitHubError", () => {
  it("maps 404 to not_found", () => {
    const error = mapGitHubError({
      status: 404,
      headers: makeHeaders({}),
      message: "Not Found"
    });
    expect(error.category).toBe("not_found");
  });

  it("maps 401 to auth_required", () => {
    const error = mapGitHubError({
      status: 401,
      headers: makeHeaders({}),
      message: "Unauthorized"
    });
    expect(error.category).toBe("auth_required");
  });

  it("maps rate limits to rate_limited", () => {
    const error = mapGitHubError({
      status: 403,
      headers: makeHeaders({ "x-ratelimit-remaining": "0" }),
      message: "API rate limit exceeded"
    });
    expect(error.category).toBe("rate_limited");
  });
});
