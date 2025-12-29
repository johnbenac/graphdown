import type { PersistedRepoSnapshot, RepoSnapshot } from "./types";

export function serializeRepoSnapshot(snapshot: RepoSnapshot): PersistedRepoSnapshot {
  return {
    files: [...snapshot.files.entries()],
  };
}

export function deserializeRepoSnapshot(snapshot: PersistedRepoSnapshot): RepoSnapshot {
  return {
    files: new Map(snapshot.files),
  };
}
