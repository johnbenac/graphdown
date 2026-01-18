export type { CommitPlan, CommitFileOp, RelPath } from "./commitPlan";
export { planGraphdownCommit } from "./commitPlan";
export { VcsApplyNotImplementedError } from "./errors";

import type { CommitPlan } from "./commitPlan";
import { VcsApplyNotImplementedError } from "./errors";

export type VcsAdapter = {
  readonly __brand?: "VcsAdapter";
};

export async function applyCommitPlan(
  _plan: CommitPlan,
  _adapter?: VcsAdapter
): Promise<never> {
  void _plan;
  void _adapter;
  throw new VcsApplyNotImplementedError();
}
