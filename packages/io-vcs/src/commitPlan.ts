import type { DatasetSnapshot } from "@graphdown/core";
import { toBytes } from "./bytes";
import { DuplicateCommitPathError } from "./errors";
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
  const grouped = new Map<string, { rawPath: string; bytes: Uint8Array }[]>();

  for (const [rawPath, contents] of renderResult.files.entries()) {
    const normalized = normalizeRelPath(rawPath);
    const key = normalized as string;
    const entry = {
      rawPath,
      bytes: toBytes(contents)
    };

    const existing = grouped.get(key);
    if (existing) {
      existing.push(entry);
    } else {
      grouped.set(key, [entry]);
    }
  }

  const dupKeys = [...grouped.entries()]
    .filter(([, entries]) => entries.length > 1)
    .map(([key]) => key)
    .sort();

  if (dupKeys.length > 0) {
    const dupKey = dupKeys[0];
    const entries = grouped.get(dupKey);
    if (entries) {
      const rawPaths = entries.map((entry) => entry.rawPath).sort();
      throw new DuplicateCommitPathError(dupKey as RelPath, rawPaths);
    }
  }

  const ops: CommitFileOp[] = [];
  for (const [key, entries] of grouped.entries()) {
    ops.push({
      kind: "write",
      path: key as RelPath,
      bytes: entries[0].bytes
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
