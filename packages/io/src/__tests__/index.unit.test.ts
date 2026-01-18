import { describe, expect, it } from "vitest";

import { selectSemanticSnapshotFiles } from "../index";

describe("@graphdown/io exports", () => {
  it("exports selectSemanticSnapshotFiles", () => {
    expect(typeof selectSemanticSnapshotFiles).toBe("function");
  });
});
