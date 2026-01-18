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

export function planGraphdownCommit(renderResult: DatasetSnapshot): CommitPlan {
  const ops = Array.from(renderResult.files.entries()).map(([path, content]) => {
    const normalizedPath = normalizeRelPath(path);
    return {
      kind: "write",
      path: normalizedPath,
      bytes: toBytes(content)
    } satisfies CommitFileOp;
  });

  ops.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

  return {
    ops,
    message: `graphdown: update ${ops.length} files`,
    meta: { generator: "@graphdown/io-vcs" }
  };
}
