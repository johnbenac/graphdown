import type { DatasetSnapshot } from "@graphdown/core";

export type SerializedDatasetSnapshotV1 = {
  files: Array<[string, Uint8Array]>;
};

export function serializeDatasetSnapshotV1(
  snapshot: DatasetSnapshot
): SerializedDatasetSnapshotV1 {
  const entries = [...snapshot.files.entries()].sort(([pathA], [pathB]) =>
    pathA.localeCompare(pathB)
  );
  return {
    files: entries.map(([path, contents]) => [path, contents])
  };
}

export function deserializeDatasetSnapshotV1(
  input: unknown
):
  | { ok: true; snapshot: DatasetSnapshot }
  | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Snapshot payload must be an object." };
  }
  const record = input as { files?: unknown };
  if (!Array.isArray(record.files)) {
    return { ok: false, error: "Snapshot files must be an array." };
  }
  const files: Array<[string, Uint8Array]> = [];
  for (const entry of record.files) {
    if (!Array.isArray(entry) || entry.length !== 2) {
      return { ok: false, error: "Snapshot entries must be [path, bytes] tuples." };
    }
    const [path, contents] = entry;
    if (typeof path !== "string" || !(contents instanceof Uint8Array)) {
      return { ok: false, error: "Snapshot entries must be [string, Uint8Array]." };
    }
    files.push([path, contents]);
  }
  return { ok: true, snapshot: { files: new Map(files) } };
}
