import { describe, expect, it } from "vitest";
import * as ioGitHub from "../index";

describe("io-github public API", () => {
  it("exports GitHub IO helpers", () => {
    expect(typeof ioGitHub.parseGitHubUrl).toBe("function");
    expect(typeof ioGitHub.loadGitHubSnapshot).toBe("function");
    expect(typeof ioGitHub.mapGitHubError).toBe("function");
    expect(typeof ioGitHub.GitHubImportError).toBe("function");
  });
});
