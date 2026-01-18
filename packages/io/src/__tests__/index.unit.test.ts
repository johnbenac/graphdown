import { describe, expect, it } from "vitest";
import { selectSemanticSnapshotFiles } from "../index";

describe("io index exports", () => {
  it("exports selectSemanticSnapshotFiles", () => {
    expect(selectSemanticSnapshotFiles).toBeTypeOf("function");
  });
});
