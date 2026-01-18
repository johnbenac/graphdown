import { describe, expect, it } from "vitest";
import * as ioGitHub from "../index";

describe("io-github index", () => {
  it("exports GitHub importer APIs", () => {
    expect(ioGitHub.parseGitHubUrl).toBeTypeOf("function");
    expect(ioGitHub.loadGitHubSnapshot).toBeTypeOf("function");
    expect(ioGitHub.mapGitHubError).toBeTypeOf("function");
    expect(ioGitHub.GitHubImportError).toBeTypeOf("function");
  });
});
