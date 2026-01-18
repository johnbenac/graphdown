export class VcsApplyNotImplementedError extends Error {
  readonly code = "IO_VCS_APPLY_NOT_IMPLEMENTED";

  constructor() {
    super("applyCommitPlan is not implemented yet (PR4 stub).");
    this.name = "VcsApplyNotImplementedError";
  }
}
