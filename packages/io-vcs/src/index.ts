import type { DatasetSnapshot } from "@graphdown/core";

import type { CommitFileOp, CommitPlan } from "./commitPlan";
import { VcsApplyNotImplementedError } from "./errors";
import { toBytes } from "./bytes";
import { normalizeRelPath } from "./path";

export type { CommitFileOp, CommitPlan, RelPath } from "./commitPlan";
export { VcsApplyNotImplementedError } from "./errors";

export type VcsAdapter = Record<string, never>;

export function planGraphdownCommit(renderResult: DatasetSnapshot): CommitPlan {
  const ops: CommitFileOp[] = [];
  const normalizedPaths = new Set<string>();

  for (const [path, contents] of renderResult.files) {
    const normalized = normalizeRelPath(path);
    if (normalizedPaths.has(normalized)) {
      throw new Error(`Duplicate normalized path: ${normalized}`);
    }
    normalizedPaths.add(normalized);
    ops.push({
      kind: "write",
      path: normalized,
      bytes: toBytes(contents)
    });
  }

  ops.sort((a, b) => {
    if (a.path < b.path) return -1;
    if (a.path > b.path) return 1;
    return 0;
  });

  return {
    ops,
    message: `graphdown: update ${ops.length} files`,
    meta: { generator: "@graphdown/io-vcs" }
  };
}

export async function applyCommitPlan(plan: CommitPlan, adapter?: VcsAdapter): Promise<never> {
  void plan;
  void adapter;
  throw new VcsApplyNotImplementedError();
}
