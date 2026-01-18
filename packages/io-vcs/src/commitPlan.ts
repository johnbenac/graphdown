import type { DatasetSnapshot } from "@graphdown/core";
import { toBytes } from "./bytes";
import { normalizeRelPath } from "./path";

export type RelPath = string & { readonly __brand: "RelPath" };

export type CommitFileOp =
  | {
      readonly kind: "write";
      readonly path: RelPath;
      readonly bytes: Uint8Array;
      readonly mode?: "file" | "executable" | "symlink";
    }
  | {
      readonly kind: "delete";
      readonly path: RelPath;
    };

export interface CommitPlan {
  readonly ops: readonly CommitFileOp[];
  readonly message: string;
  readonly meta?: Record<string, unknown>;
}

export function planGraphdownCommit(renderResult: DatasetSnapshot): CommitPlan;
export function planGraphdownCommit(renderResult: {
  files: Map<string, Uint8Array | string>;
}): CommitPlan;
export function planGraphdownCommit(renderResult: {
  files: Map<string, Uint8Array | string>;
}): CommitPlan {
  const ops: CommitFileOp[] = [];

  for (const [path, contents] of renderResult.files.entries()) {
    const normalized = normalizeRelPath(path);
    ops.push({
      kind: "write",
      path: normalized,
      bytes: toBytes(contents)
    });
  }

  ops.sort((a, b) => {
    const pathA = a.path as string;
    const pathB = b.path as string;
    if (pathA < pathB) return -1;
    if (pathA > pathB) return 1;
    return 0;
  });

  return {
    ops,
    message: `graphdown: update ${ops.length} files`,
    meta: {
      generator: "@graphdown/io-vcs"
    }
  };
}
