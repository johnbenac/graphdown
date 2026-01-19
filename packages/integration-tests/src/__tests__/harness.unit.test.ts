import { describe, expect, it } from "vitest";
import { snapshotFromTextFiles } from "../harness";

describe("snapshotFromTextFiles", () => {
  it("encodes UTF-8 bytes", () => {
    const snap = snapshotFromTextFiles([["hello.txt", "hi"]]);
    expect(snap.files.get("hello.txt")).toEqual(new TextEncoder().encode("hi"));
  });
});
