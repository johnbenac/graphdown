import { describe, expect, it } from "vitest";
import { parseGitHubUrl } from "./parseGitHubUrl";

describe("parseGitHubUrl", () => {
  it("accepts basic repo URLs", () => {
    const result = parseGitHubUrl("https://github.com/owner/repo");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.owner).toBe("owner");
      expect(result.value.repo).toBe("repo");
      expect(result.value.ref).toBeUndefined();
      expect(result.value.canonicalRepoUrl).toBe("https://github.com/owner/repo");
    }
  });

  it("accepts repo URLs with trailing slash and .git", () => {
    const slashResult = parseGitHubUrl("https://github.com/owner/repo/");
    expect(slashResult.ok).toBe(true);

    const gitResult = parseGitHubUrl("https://github.com/owner/repo.git");
    expect(gitResult.ok).toBe(true);
    if (gitResult.ok) {
      expect(gitResult.value.repo).toBe("repo");
    }
  });

  it("accepts tree ref URLs", () => {
    const result = parseGitHubUrl("https://github.com/owner/repo/tree/main");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.ref).toBe("main");
    }
  });

  it("accepts scheme-less repo URLs", () => {
    const result = parseGitHubUrl("github.com/owner/repo");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.owner).toBe("owner");
      expect(result.value.repo).toBe("repo");
    }
  });

  it("rejects tree URLs with subdirectories", () => {
    const result = parseGitHubUrl("https://github.com/owner/repo/tree/main/path/to/dataset");
    expect(result.ok).toBe(false);
  });

  it("rejects invalid URLs", () => {
    const invalidInputs = [
      "",
      "https://example.com/owner/repo",
      "https://github.com/owner",
      "https://github.com/owner/repo/blob/main/readme.md",
      "https://github.com/owner/repo/tree",
      "https://github.com/owner/repo/tree/main/path/to/dataset"
    ];

    for (const input of invalidInputs) {
      const result = parseGitHubUrl(input);
      expect(result.ok).toBe(false);
    }
  });
});
