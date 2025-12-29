import type { RepoSnapshot } from "@graphdown/core";

export interface PersistedRepoSnapshot {
  files: Array<[string, Uint8Array]>;
}

export function serializeRepoSnapshot(snapshot: RepoSnapshot): PersistedRepoSnapshot {
  return {
    files: [...snapshot.files.entries()],
  };
}

export function deserializeRepoSnapshot(raw: PersistedRepoSnapshot): RepoSnapshot {
  return {
    files: new Map(raw.files),
  };
}
