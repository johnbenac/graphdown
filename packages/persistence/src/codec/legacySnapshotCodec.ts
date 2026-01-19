import type { DatasetSnapshot } from "@graphdown/core";
import type { PersistedDatasetSnapshot } from "../types";

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
    files: new Map(
      snapshot.files.map(({ path, contents }) => [path, normalizeBytes(contents) ?? contents])
    )
  };
}

function normalizeBytes(value: unknown): Uint8Array | null {
  if (value instanceof Uint8Array) {
    return value;
  }
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  return null;
}
