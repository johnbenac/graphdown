import { describe, expect, it } from "vitest";
import { ImportError, isImportError } from "../errors";

describe("ImportError", () => {
  it("identifies ImportError instances", () => {
    const error = new ImportError({
      source: "github",
      code: "not_found",
      message: "Missing"
    });

    expect(isImportError(error)).toBe(true);
  });

  it("rejects non-ImportError instances", () => {
    expect(isImportError(new Error("nope"))).toBe(false);
  });

  it("preserves message", () => {
    const error = new ImportError({
      source: "zip",
      code: "invalid_input",
      message: "Bad zip"
    });

    expect(error.message).toBe("Bad zip");
  });
});
