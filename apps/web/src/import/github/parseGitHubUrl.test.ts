import { describe, expect, it } from "vitest";
import { parseGitHubUrl } from "./parseGitHubUrl";

describe("parseGitHubUrl", () => {
  it("GH-001: accepts https repo URLs", () => {
    const result = parseGitHubUrl("https://github.com/owner/repo");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.owner).toBe("owner");
      expect(result.value.repo).toBe("repo");
      expect(result.value.ref).toBeUndefined();
      expect(result.value.canonicalRepoUrl).toBe("https://github.com/owner/repo");
    }
  });

  it("GH-001: accepts repo URLs with trailing slash and .git", () => {
    const slashResult = parseGitHubUrl("https://github.com/owner/repo/");
    expect(slashResult.ok).toBe(true);

    const gitResult = parseGitHubUrl("https://github.com/owner/repo.git");
    expect(gitResult.ok).toBe(true);
    if (gitResult.ok) {
      expect(gitResult.value.repo).toBe("repo");
    }
  });

  it("GH-001: accepts /tree/<ref> URLs", () => {
    const result = parseGitHubUrl("https://github.com/owner/repo/tree/main");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.ref).toBe("main");
    }
  });

  it("GH-001: accepts scheme-less repo URLs", () => {
    const result = parseGitHubUrl("github.com/owner/repo");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.owner).toBe("owner");
      expect(result.value.repo).toBe("repo");
    }
  });

  it("GH-005: rejects /tree/<ref>/<subdir> URLs", () => {
    const result = parseGitHubUrl(
      "https://github.com/owner/repo/tree/main/path/to/dataset"
    );
    expect(result.ok).toBe(false);
  });

  it("GH-001: rejects malformed, non-github, or unsupported URLs", () => {
    const invalidInputs = [
      "",
      "https://example.com/owner/repo",
      "https://github.com/owner",
      "https://github.com/owner/repo/blob/main/readme.md",
      "https://github.com/owner/repo/tree",
    ];

    for (const input of invalidInputs) {
      const result = parseGitHubUrl(input);
      expect(result.ok).toBe(false);
    }
  });
});
