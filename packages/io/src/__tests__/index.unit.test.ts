import { describe, expect, it } from "vitest";

import { selectSemanticSnapshotFiles } from "../index";

describe("@graphdown/io index", () => {
  it("exports selectSemanticSnapshotFiles", () => {
    expect(typeof selectSemanticSnapshotFiles).toBe("function");
  });
});
