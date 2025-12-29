import { describe, expect, it } from "vitest";
import { mapGitHubError } from "./mapGitHubError";
import { parseGitHubUrl } from "./parseGitHubUrl";

describe("parseGitHubUrl", () => {
  it("accepts repo URLs", () => {
    expect(parseGitHubUrl("https://github.com/octo/demo")).toEqual({
      ok: true,
      value: {
        owner: "octo",
        repo: "demo",
        canonicalRepoUrl: "https://github.com/octo/demo"
      }
    });
    expect(parseGitHubUrl("https://github.com/octo/demo/").ok).toBe(true);
    expect(parseGitHubUrl("https://github.com/octo/demo.git").ok).toBe(true);
  });

  it("accepts tree URLs without subdirectories", () => {
    const result = parseGitHubUrl("https://github.com/octo/demo/tree/main");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.ref).toBe("main");
    }
  });

  it("rejects non-repo GitHub pages", () => {
    const result = parseGitHubUrl("https://github.com/octo/demo/blob/main/README.md");
    expect(result.ok).toBe(false);
  });

  it("rejects non-GitHub hosts", () => {
    const result = parseGitHubUrl("https://example.com/octo/demo");
    expect(result.ok).toBe(false);
  });
});

describe("mapGitHubError", () => {
  it("maps not found", () => {
    expect(mapGitHubError({ status: 404 }).category).toBe("not_found");
  });

  it("maps auth required", () => {
    expect(mapGitHubError({ status: 401 }).category).toBe("auth_required");
  });

  it("maps rate limited on 403 with rate headers", () => {
    const headers = new Headers({ "x-ratelimit-remaining": "0" });
    expect(mapGitHubError({ status: 403, headers }).category).toBe("rate_limited");
  });
});
