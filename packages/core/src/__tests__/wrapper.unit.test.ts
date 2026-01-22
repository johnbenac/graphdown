import { describe, expect, it } from "vitest";
import * as core from "../index";

describe("core wrapper", () => {
  it("re-exports dataset API", () => {
    expect(core.validateDatasetSnapshot).toBeDefined();
    expect(core.canonicalizeDatasetSnapshot).toBeDefined();
    expect(core.computeGdHashV1).toBeDefined();
  });
});
