import type { RelPath } from "./commitPlan";

export class DuplicateCommitPathError extends Error {
  readonly code = "IO_VCS_DUPLICATE_COMMIT_PATH";
  readonly normalizedPath: RelPath;
  readonly inputPaths: readonly string[];

  constructor(normalizedPath: RelPath, inputPaths: readonly string[]) {
    const sorted = [...inputPaths].sort();
    super(
      `Duplicate commit path after normalization: ${normalizedPath} (from: ${sorted.join(
        ", "
      )})`
    );
    this.name = "DuplicateCommitPathError";
    this.normalizedPath = normalizedPath;
    this.inputPaths = sorted;
  }
}

export class VcsApplyNotImplementedError extends Error {
  readonly code = "IO_VCS_APPLY_NOT_IMPLEMENTED";

  constructor() {
    super("applyCommitPlan is not implemented yet (PR4 stub).");
    this.name = "VcsApplyNotImplementedError";
  }
}
