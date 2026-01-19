import type { DatasetSnapshot } from "@graphdown/core";

export type SerializedDatasetSnapshotV1 = {
  files: Array<[string, Uint8Array]>;
};

export function serializeDatasetSnapshotV1(
  snapshot: DatasetSnapshot
): SerializedDatasetSnapshotV1 {
  const files = [...snapshot.files.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, contents]) => [path, contents] as [string, Uint8Array]);
  return { files };
}

export function deserializeDatasetSnapshotV1(
  input: unknown
): { ok: true; snapshot: DatasetSnapshot } | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Snapshot payload must be an object." };
  }
  const files = (input as SerializedDatasetSnapshotV1).files;
  if (!Array.isArray(files)) {
    return { ok: false, error: "Snapshot files must be an array." };
  }
  const entries: Array<[string, Uint8Array]> = [];
  for (const entry of files) {
    if (!Array.isArray(entry) || entry.length !== 2) {
      return { ok: false, error: "Snapshot file entries must be tuple pairs." };
    }
    const [path, contents] = entry;
    const bytes = normalizeBytes(contents);
    if (typeof path !== "string" || !bytes) {
      return { ok: false, error: "Snapshot file entries must be [string, Uint8Array]." };
    }
    entries.push([path, bytes]);
  }
  return { ok: true, snapshot: { files: new Map(entries) } };
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
