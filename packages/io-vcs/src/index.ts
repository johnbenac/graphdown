import type { CommitPlan } from "./commitPlan";
import { VcsApplyNotImplementedError } from "./errors";

export type { CommitFileOp, CommitPlan, RelPath } from "./commitPlan";
export { planGraphMDCommit } from "./commitPlan";
export { VcsApplyNotImplementedError };
export { DuplicateCommitPathError } from "./errors";

export type VcsAdapter = Record<string, never>;

export async function applyCommitPlan(
  _plan: CommitPlan,
  _adapter?: VcsAdapter
): Promise<never> {
  void _plan;
  void _adapter;
  throw new VcsApplyNotImplementedError();
}
