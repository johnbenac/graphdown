import type { DatasetSnapshot } from "@graphdown/core";
import type { PersistedDatasetSnapshot } from "./types";

export function serializeSnapshot(snapshot: DatasetSnapshot): PersistedDatasetSnapshot {
  return {
    files: [...snapshot.files.entries()].map(([path, contents]) => ({
      path,
      contents
    }))
  };
}

export function deserializeSnapshot(snapshot: PersistedDatasetSnapshot): DatasetSnapshot {
  return {
    files: new Map(snapshot.files.map(({ path, contents }) => [path, contents]))
  };
}
