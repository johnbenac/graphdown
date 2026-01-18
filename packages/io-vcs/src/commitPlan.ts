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
