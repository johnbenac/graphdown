import { describe, expect, it } from "vitest";

import { applyCommitPlan, planGraphdownCommit, VcsApplyNotImplementedError } from "../index";

const encode = (value: string): Uint8Array => new TextEncoder().encode(value);

const snapshotFromEntries = (
  entries: Array<[string, Uint8Array | string]>
): { files: Map<string, Uint8Array | string> } => ({
  files: new Map(entries)
});

describe("planGraphdownCommit", () => {
  it("is deterministic for identical content", () => {
    const a = snapshotFromEntries([
      ["b.txt", encode("b")],
      ["a.txt", encode("a")]
    ]);
    const b = snapshotFromEntries([
      ["a.txt", encode("a")],
      ["b.txt", encode("b")]
    ]);

    expect(planGraphdownCommit(a)).toEqual(planGraphdownCommit(b));
  });

  it("orders paths lexicographically", () => {
    const snapshot = snapshotFromEntries([
      ["b.txt", encode("b")],
      ["dir/z.txt", encode("z")],
      ["dir/a.txt", encode("a")],
      ["a.txt", encode("a")]
    ]);

    const plan = planGraphdownCommit(snapshot);
    const paths = plan.ops.map((op) => op.path);

    expect(paths).toEqual(["a.txt", "b.txt", "dir/a.txt", "dir/z.txt"]);
  });

  it("preserves bytes exactly", () => {
    const bytes = new Uint8Array([0, 1, 2, 255, 254]);
    const snapshot = snapshotFromEntries([["data.bin", bytes]]);

    const plan = planGraphdownCommit(snapshot);

    expect(plan.ops).toHaveLength(1);
    const op = plan.ops[0];
    if (op.kind !== "write") {
      throw new Error("Expected write op");
    }

    expect(op.bytes).toEqual(bytes);
  });

  it("encodes string content as UTF-8", () => {
    const snapshot = snapshotFromEntries([["utf8.txt", "λ"]]);

    const plan = planGraphdownCommit(snapshot);
    const op = plan.ops[0];
    if (op.kind !== "write") {
      throw new Error("Expected write op");
    }

    expect(op.bytes).toEqual(encode("λ"));
  });

  it("rejects unsafe paths", () => {
    const invalidPaths = [
      "../secrets.txt",
      "dir/../../oops.txt",
      "/absolute.txt",
      "C:\\\\absolute.txt",
      "\\\\server\\share\\x.txt"
    ];

    for (const path of invalidPaths) {
      const snapshot = snapshotFromEntries([[path, encode("x")]]);
      expect(() => planGraphdownCommit(snapshot)).toThrow(/Invalid relative path/);
    }
  });
});

describe("applyCommitPlan", () => {
  it("throws a not implemented error", async () => {
    const snapshot = snapshotFromEntries([["a.txt", encode("a")]]);
    const plan = planGraphdownCommit(snapshot);

    await expect(applyCommitPlan(plan)).rejects.toBeInstanceOf(VcsApplyNotImplementedError);
    await expect(applyCommitPlan(plan)).rejects.toMatchObject({
      code: "IO_VCS_APPLY_NOT_IMPLEMENTED"
    });
  });
});
