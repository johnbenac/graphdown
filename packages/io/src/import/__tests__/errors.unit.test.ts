import { describe, expect, it } from "vitest";
import { ImportError, isImportError } from "../errors";

describe("ImportError", () => {
  it("recognizes ImportError instances", () => {
    const error = new ImportError({
      source: "zip",
      code: "invalid_input",
      message: "Invalid zip"
    });

    expect(isImportError(error)).toBe(true);
  });

  it("does not recognize plain Error instances", () => {
    expect(isImportError(new Error("nope"))).toBe(false);
  });

  it("preserves the info message", () => {
    const error = new ImportError({
      source: "github",
      code: "unknown",
      message: "Something happened"
    });

    expect(error.message).toBe("Something happened");
  });
});
