import type { DatasetSnapshot } from "@graphdown/dataset";

export type SerializedDatasetSnapshotV1 = {
  files: Array<[string, Uint8Array]>;
};

export function serializeDatasetSnapshotV1(snapshot: DatasetSnapshot): SerializedDatasetSnapshotV1 {
  const files = [...snapshot.files.entries()].sort(([left], [right]) =>
    left.localeCompare(right)
  );
  return {
    files: files.map(([path, contents]) => [path, contents])
  };
}

export function deserializeDatasetSnapshotV1(
  input: unknown
):
  | { ok: true; snapshot: DatasetSnapshot }
  | {
      ok: false;
      error: string;
    } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Snapshot payload must be an object." };
  }
  const record = input as { files?: unknown };
  if (!Array.isArray(record.files)) {
    return { ok: false, error: "Snapshot files must be an array." };
  }
  const files = new Map<string, Uint8Array>();
  for (const entry of record.files) {
    if (!Array.isArray(entry) || entry.length !== 2) {
      return { ok: false, error: "Snapshot file entries must be [path, contents] tuples." };
    }
    const [path, contents] = entry;
    if (typeof path !== "string" || !(contents instanceof Uint8Array)) {
      return { ok: false, error: "Snapshot file entries must contain a string and Uint8Array." };
    }
    files.set(path, contents);
  }
  return { ok: true, snapshot: { files } };
}
