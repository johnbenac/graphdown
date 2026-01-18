export type { CommitFileOp, CommitPlan, GraphdownRenderResult, RelPath } from "./commitPlan";
export { planGraphdownCommit } from "./commitPlan";
export { VcsApplyNotImplementedError } from "./errors";

import type { CommitPlan } from "./commitPlan";
import { VcsApplyNotImplementedError } from "./errors";

export type VcsAdapter = Record<string, never>;

export async function applyCommitPlan(_plan: CommitPlan, _adapter?: VcsAdapter): Promise<never> {
  void _adapter;
  throw new VcsApplyNotImplementedError();
}
