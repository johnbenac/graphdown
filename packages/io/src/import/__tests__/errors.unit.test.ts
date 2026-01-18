import { describe, expect, it } from "vitest";
import { ImportError, isImportError } from "../errors";

describe("ImportError", () => {
  it("detects structured import errors", () => {
    const error = new ImportError({
      source: "zip",
      code: "invalid_input",
      message: "Bad zip"
    });

    expect(isImportError(error)).toBe(true);
  });

  it("rejects plain errors", () => {
    expect(isImportError(new Error("nope"))).toBe(false);
  });

  it("preserves the error message", () => {
    const error = new ImportError({
      source: "github",
      code: "unknown",
      message: "Something went wrong"
    });

    expect(error.message).toBe("Something went wrong");
  });
});
