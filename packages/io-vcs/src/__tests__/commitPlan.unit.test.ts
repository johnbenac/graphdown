import { describe, expect, it } from "vitest";
import type { DatasetSnapshot } from "@graphdown/core";
import {
  applyCommitPlan,
  planGraphdownCommit,
  VcsApplyNotImplementedError
} from "../index";
import { normalizeRelPath } from "../path";
import { toBytes } from "../bytes";

const encoder = new TextEncoder();

function snapshot(entries: Array<[string, Uint8Array]>): DatasetSnapshot {
  return { files: new Map(entries) };
}

describe("planGraphdownCommit", () => {
  it("is deterministic for identical inputs", () => {
    const a = snapshot([
      ["b.txt", encoder.encode("b")],
      ["a.txt", encoder.encode("a")]
    ]);
    const b = snapshot([
      ["a.txt", encoder.encode("a")],
      ["b.txt", encoder.encode("b")]
    ]);

    const planA = planGraphdownCommit(a);
    const planB = planGraphdownCommit(b);

    expect(planA).toEqual(planB);
  });

  it("sorts operations by normalized path", () => {
    const plan = planGraphdownCommit(
      snapshot([
        ["b.txt", encoder.encode("b")],
        ["a.txt", encoder.encode("a")],
        ["dir/z.txt", encoder.encode("z")],
        ["dir/a.txt", encoder.encode("a")]
      ])
    );

    expect(plan.ops.map((op) => op.path)).toEqual([
      "a.txt",
      "b.txt",
      "dir/a.txt",
      "dir/z.txt"
    ]);
  });

  it("preserves bytes exactly", () => {
    const bytes = new Uint8Array([0, 1, 2, 255, 254]);
    const plan = planGraphdownCommit(snapshot([["bin.dat", bytes]]));

    expect(plan.ops).toHaveLength(1);
    expect(plan.ops[0].kind).toBe("write");
    expect(plan.ops[0].bytes).toEqual(bytes);
  });
});

describe("toBytes", () => {
  it("encodes strings as UTF-8", () => {
    expect(toBytes("λ")).toEqual(encoder.encode("λ"));
  });
});

describe("normalizeRelPath", () => {
  it("rejects unsafe paths", () => {
    const unsafePaths = [
      "../secrets.txt",
      "dir/../../oops.txt",
      "/absolute.txt",
      "C:\\absolute.txt",
      "\\\\server\\share\\x.txt"
    ];

    for (const unsafePath of unsafePaths) {
      expect(() => normalizeRelPath(unsafePath)).toThrow(/Invalid relative path/);
    }
  });
});

describe("applyCommitPlan", () => {
  it("throws a not implemented error", async () => {
    const plan = { ops: [], message: "noop" };

    await expect(applyCommitPlan(plan)).rejects.toBeInstanceOf(
      VcsApplyNotImplementedError
    );
    await expect(applyCommitPlan(plan)).rejects.toMatchObject({
      code: "IO_VCS_APPLY_NOT_IMPLEMENTED"
    });
  });
});
