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

export type GraphdownRenderResult = DatasetSnapshot | { files: Map<string, Uint8Array | string> };

const comparePaths = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export function planGraphdownCommit(renderResult: GraphdownRenderResult): CommitPlan {
  const ops: CommitFileOp[] = [];
  for (const [path, content] of renderResult.files) {
    const normalized = normalizeRelPath(path);
    ops.push({
      kind: "write",
      path: normalized,
      bytes: toBytes(content)
    });
  }

  ops.sort((a, b) => comparePaths(a.path, b.path));

  return {
    ops,
    message: `graphdown: update ${ops.length} files`,
    meta: { generator: "@graphdown/io-vcs" }
  };
}
