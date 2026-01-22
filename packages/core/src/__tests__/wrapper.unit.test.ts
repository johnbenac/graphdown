import { describe, expect, it } from "vitest";
import * as core from "../index";

describe("core wrapper", () => {
  it("re-exports dataset API", () => {
    expect(core.validateDatasetSnapshot).toBeDefined();
    expect(core.makeError).toBeDefined();
    expect(core.parseMarkdownRecord).toBeDefined();
  });
});
