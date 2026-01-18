import { describe, expect, it } from "vitest";
import * as io from "../index";

describe("io public API", () => {
  it("exports selection helpers", () => {
    expect(typeof io.selectSemanticSnapshotFiles).toBe("function");
  });
});
