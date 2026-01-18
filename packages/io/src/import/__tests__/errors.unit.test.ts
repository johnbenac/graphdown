import { describe, expect, it } from "vitest";
import { ImportError, isImportError } from "../errors";

describe("ImportError", () => {
  it("isImportError returns true for ImportError", () => {
    const error = new ImportError({
      source: "zip",
      code: "invalid_input",
      message: "Oops"
    });

    expect(isImportError(error)).toBe(true);
  });

  it("isImportError returns false for non-import errors", () => {
    expect(isImportError(new Error("nope"))).toBe(false);
  });

  it("preserves message on ImportError", () => {
    const error = new ImportError({
      source: "github",
      code: "unknown",
      message: "Wrapped"
    });

    expect(error.message).toBe("Wrapped");
  });
});
