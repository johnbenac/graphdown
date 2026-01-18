import { describe, expect, it } from "vitest";
import * as ioGithub from "../index";

describe("io-github public API", () => {
  it("exports GitHub import helpers", () => {
    expect(typeof ioGithub.parseGitHubUrl).toBe("function");
    expect(typeof ioGithub.loadGitHubSnapshot).toBe("function");
    expect(typeof ioGithub.mapGitHubError).toBe("function");
    expect(typeof ioGithub.GitHubImportError).toBe("function");
  });
});
