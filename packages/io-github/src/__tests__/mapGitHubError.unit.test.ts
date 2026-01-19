import { afterEach, describe, expect, it, vi } from "vitest";
import { mapGitHubError } from "../mapGitHubError";

describe("mapGitHubError retryAfterSeconds", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("sets retryAfterSeconds from Retry-After header on 429", () => {
    const response = new Response(
      JSON.stringify({ message: "API rate limit exceeded" }),
      {
        status: 429,
        headers: {
          "content-type": "application/json",
          "retry-after": "120"
        }
      }
    );

    const info = mapGitHubError(response, "API rate limit exceeded");

    expect(info.source).toBe("github");
    expect(info.code).toBe("rate_limited");
    expect(info.httpStatus).toBe(429);
    expect(info.retryAfterSeconds).toBe(120);
  });

  it("sets retryAfterSeconds from x-ratelimit-reset when remaining is 0 (403)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-19T00:00:00Z"));

    const nowSec = Math.floor(Date.now() / 1000);
    const resetSec = nowSec + 90;

    const response = new Response(
      JSON.stringify({ message: "API rate limit exceeded" }),
      {
        status: 403,
        headers: {
          "content-type": "application/json",
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": String(resetSec)
        }
      }
    );

    const info = mapGitHubError(response, "API rate limit exceeded");

    expect(info.source).toBe("github");
    expect(info.code).toBe("rate_limited");
    expect(info.httpStatus).toBe(403);
    expect(info.retryAfterSeconds).toBe(90);
  });
});
