import type { RepoSnapshot } from "../../../../src/core/snapshotTypes";
import type { PersistedRepoSnapshot } from "./types";

export function serializeSnapshot(snapshot: RepoSnapshot): PersistedRepoSnapshot {
  return {
    files: [...snapshot.files.entries()].map(([path, contents]) => ({
      path,
      contents
    }))
  };
}

export function deserializeSnapshot(snapshot: PersistedRepoSnapshot): RepoSnapshot {
  return {
    files: new Map(snapshot.files.map(({ path, contents }) => [path, contents]))
  };
}
