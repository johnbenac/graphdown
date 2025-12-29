import { describe, expect, it } from "vitest";
import { parseGitHubUrl } from "./parseGitHubUrl";

describe("parseGitHubUrl", () => {
  it("accepts standard repository URLs", () => {
    const result = parseGitHubUrl("https://github.com/octocat/hello-world");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.owner).toBe("octocat");
      expect(result.value.repo).toBe("hello-world");
      expect(result.value.ref).toBeUndefined();
    }
  });

  it("accepts trailing slash and .git URLs", () => {
    const trailing = parseGitHubUrl("https://github.com/octocat/hello-world/");
    expect(trailing.ok).toBe(true);

    const dotGit = parseGitHubUrl("https://github.com/octocat/hello-world.git");
    expect(dotGit.ok).toBe(true);
    if (dotGit.ok) {
      expect(dotGit.value.repo).toBe("hello-world");
    }
  });

  it("accepts tree URLs with refs", () => {
    const result = parseGitHubUrl("https://github.com/octocat/hello-world/tree/main");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.ref).toBe("main");
    }
  });

  it("rejects missing scheme", () => {
    const result = parseGitHubUrl("github.com/octocat/hello-world");
    expect(result.ok).toBe(false);
  });

  it("rejects non-github hosts", () => {
    const result = parseGitHubUrl("https://example.com/octocat/hello-world");
    expect(result.ok).toBe(false);
  });

  it("rejects missing repo", () => {
    const result = parseGitHubUrl("https://github.com/octocat");
    expect(result.ok).toBe(false);
  });

  it("rejects blob URLs and subdirectories", () => {
    const blob = parseGitHubUrl("https://github.com/octocat/hello-world/blob/main/readme.md");
    expect(blob.ok).toBe(false);

    const subdir = parseGitHubUrl("https://github.com/octocat/hello-world/tree/main/path");
    expect(subdir.ok).toBe(false);
  });
});
