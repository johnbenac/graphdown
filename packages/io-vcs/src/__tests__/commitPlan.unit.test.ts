import { describe, expect, it } from "vitest";
import {
  applyCommitPlan,
  DuplicateCommitPathError,
  planGraphdownCommit,
  VcsApplyNotImplementedError
} from "../index";

const encoder = new TextEncoder();

describe("planGraphdownCommit", () => {
  it("is deterministic regardless of file iteration order", () => {
    const filesA = new Map<string, Uint8Array>([
      ["b.txt", encoder.encode("beta")],
      ["a.txt", encoder.encode("alpha")]
    ]);
    const filesB = new Map<string, Uint8Array>([
      ["a.txt", encoder.encode("alpha")],
      ["b.txt", encoder.encode("beta")]
    ]);

    const planA = planGraphdownCommit({ files: filesA });
    const planB = planGraphdownCommit({ files: filesB });

    expect(planA).toEqual(planB);
  });

  it("sorts paths lexicographically", () => {
    const files = new Map<string, Uint8Array>([
      ["b.txt", encoder.encode("b")],
      ["a.txt", encoder.encode("a")],
      ["dir/z.txt", encoder.encode("z")],
      ["dir/a.txt", encoder.encode("a")]
    ]);

    const plan = planGraphdownCommit({ files });

    expect(plan.ops.map((op) => op.path)).toEqual([
      "a.txt",
      "b.txt",
      "dir/a.txt",
      "dir/z.txt"
    ]);
  });

  it("preserves bytes and encodes strings in UTF-8", () => {
    const binary = new Uint8Array([0, 1, 2, 255, 254]);
    const planBinary = planGraphdownCommit({
      files: new Map([["data.bin", binary]])
    });

    const binaryOp = planBinary.ops[0];
    expect(binaryOp.kind).toBe("write");
    if (binaryOp.kind === "write") {
      expect(Array.from(binaryOp.bytes)).toEqual([0, 1, 2, 255, 254]);
    }

    const planString = planGraphdownCommit({
      files: new Map<string, Uint8Array | string>([["lambda.txt", "λ"]])
    });

    const stringOp = planString.ops[0];
    expect(stringOp.kind).toBe("write");
    if (stringOp.kind === "write") {
      expect(Array.from(stringOp.bytes)).toEqual(
        Array.from(encoder.encode("λ"))
      );
    }
  });

  it.each([
    "../secrets.txt",
    "dir/../../oops.txt",
    "/absolute.txt",
    "C:\\absolute.txt",
    "\\\\server\\share\\x.txt"
  ])("rejects unsafe path: %s", (path) => {
    const files = new Map<string, Uint8Array>([
      [path, encoder.encode("bad")]
    ]);

    expect(() => planGraphdownCommit({ files })).toThrow(/Invalid commit path/);
  });

  it("rejects duplicate normalized paths", () => {
    const files = new Map<string, Uint8Array | string>([
      ["a//b.txt", encoder.encode("one")],
      ["a/b.txt", encoder.encode("two")]
    ]);

    try {
      planGraphdownCommit({ files });
      throw new Error("Expected planGraphdownCommit to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(DuplicateCommitPathError);
      expect(err).toMatchObject({
        code: "IO_VCS_DUPLICATE_COMMIT_PATH",
        normalizedPath: "a/b.txt"
      });
    }
  });

  it("throws deterministically on normalized-path collisions regardless of Map order", () => {
    const filesA = new Map<string, Uint8Array | string>([
      ["a//b.txt", encoder.encode("one")],
      ["a/b.txt", encoder.encode("two")]
    ]);
    const filesB = new Map<string, Uint8Array | string>([
      ["a/b.txt", encoder.encode("two")],
      ["a//b.txt", encoder.encode("one")]
    ]);

    const getError = (files: Map<string, Uint8Array | string>) => {
      try {
        planGraphdownCommit({ files });
        throw new Error("Expected throw");
      } catch (err) {
        return err;
      }
    };

    const errA = getError(filesA);
    const errB = getError(filesB);

    expect(errA).toBeInstanceOf(DuplicateCommitPathError);
    expect(errB).toBeInstanceOf(DuplicateCommitPathError);
    expect((errA as Error).message).toBe((errB as Error).message);
    expect(errA).toMatchObject({
      code: "IO_VCS_DUPLICATE_COMMIT_PATH",
      normalizedPath: "a/b.txt",
      inputPaths: ["a//b.txt", "a/b.txt"]
    });
    expect(errB).toMatchObject({
      code: "IO_VCS_DUPLICATE_COMMIT_PATH",
      normalizedPath: "a/b.txt",
      inputPaths: ["a//b.txt", "a/b.txt"]
    });
  });
});

describe("applyCommitPlan", () => {
  it("throws a not-implemented error", async () => {
    const plan = {
      ops: [],
      message: "graphdown: update 0 files"
    };

    await expect(applyCommitPlan(plan)).rejects.toBeInstanceOf(
      VcsApplyNotImplementedError
    );
    await expect(applyCommitPlan(plan)).rejects.toMatchObject({
      code: "IO_VCS_APPLY_NOT_IMPLEMENTED"
    });
  });
});
