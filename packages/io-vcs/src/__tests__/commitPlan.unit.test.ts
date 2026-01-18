import { describe, expect, it } from "vitest";
import type { DatasetSnapshot } from "@graphdown/core";

import { applyCommitPlan, planGraphdownCommit, VcsApplyNotImplementedError } from "../index";

function makeSnapshot(entries: Array<[string, Uint8Array | string]>): DatasetSnapshot {
  const files = new Map<string, Uint8Array | string>(entries);
  return { files } as unknown as DatasetSnapshot;
}

describe("planGraphdownCommit", () => {
  it("is deterministic for equivalent inputs", () => {
    const a = makeSnapshot([
      ["b.txt", new Uint8Array([1])],
      ["a.txt", new Uint8Array([2])]
    ]);

    const b = makeSnapshot([
      ["a.txt", new Uint8Array([2])],
      ["b.txt", new Uint8Array([1])]
    ]);

    expect(planGraphdownCommit(a)).toEqual(planGraphdownCommit(b));
  });

  it("sorts paths lexicographically", () => {
    const snapshot = makeSnapshot([
      ["b.txt", new Uint8Array([1])],
      ["dir/z.txt", new Uint8Array([2])],
      ["a.txt", new Uint8Array([3])],
      ["dir/a.txt", new Uint8Array([4])]
    ]);

    const plan = planGraphdownCommit(snapshot);
    const paths = plan.ops.map((op) => op.path);
    expect(paths).toEqual(["a.txt", "b.txt", "dir/a.txt", "dir/z.txt"]);
  });

  it("preserves bytes exactly", () => {
    const bytes = new Uint8Array([0, 1, 2, 255, 254]);
    const snapshot = makeSnapshot([["bytes.bin", bytes]]);

    const plan = planGraphdownCommit(snapshot);
    expect(Array.from(plan.ops[0].bytes)).toEqual(Array.from(bytes));
  });

  it("encodes string content as UTF-8", () => {
    const snapshot = makeSnapshot([["unicode.txt", "λ"]]);

    const plan = planGraphdownCommit(snapshot);
    expect(Array.from(plan.ops[0].bytes)).toEqual(Array.from(new TextEncoder().encode("λ")));
  });

  it("rejects unsafe paths", () => {
    const invalid = [
      "../secrets.txt",
      "dir/../../oops.txt",
      "/absolute.txt",
      "C:\\absolute.txt",
      "\\\\server\\share\\x.txt"
    ];

    for (const path of invalid) {
      const snapshot = makeSnapshot([[path, new Uint8Array([1])]]);
      expect(() => planGraphdownCommit(snapshot)).toThrow();
    }
  });
});

describe("applyCommitPlan", () => {
  it("throws a not implemented error", async () => {
    const plan = planGraphdownCommit(makeSnapshot([["file.txt", new Uint8Array([1])]]));

    await expect(applyCommitPlan(plan)).rejects.toBeInstanceOf(VcsApplyNotImplementedError);
    await expect(applyCommitPlan(plan)).rejects.toMatchObject({
      code: "IO_VCS_APPLY_NOT_IMPLEMENTED"
    });
  });
});
