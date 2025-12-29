import { describe, expect, it } from "vitest";
import { parseGitHubUrl } from "./parseGitHubUrl";

describe("parseGitHubUrl", () => {
  it("accepts repo URLs", () => {
    const result = parseGitHubUrl("https://github.com/owner/repo");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.owner).toBe("owner");
      expect(result.value.repo).toBe("repo");
    }
  });

  it("accepts trailing slashes and .git", () => {
    const slash = parseGitHubUrl("https://github.com/owner/repo/");
    const git = parseGitHubUrl("https://github.com/owner/repo.git");
    expect(slash.ok).toBe(true);
    expect(git.ok).toBe(true);
  });

  it("accepts tree refs", () => {
    const result = parseGitHubUrl("https://github.com/owner/repo/tree/main");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.ref).toBe("main");
    }
  });

  it("rejects unsupported hosts", () => {
    const result = parseGitHubUrl("https://example.com/owner/repo");
    expect(result.ok).toBe(false);
  });

  it("rejects missing repo segments", () => {
    const result = parseGitHubUrl("https://github.com/owner");
    expect(result.ok).toBe(false);
  });

  it("rejects blob URLs", () => {
    const result = parseGitHubUrl("https://github.com/owner/repo/blob/main/readme.md");
    expect(result.ok).toBe(false);
  });
});
