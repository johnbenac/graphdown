import type { DatasetSnapshot } from "@graphdown/core";

export type SerializedDatasetSnapshotV1 = {
  files: Array<[string, Uint8Array]>;
};

export function serializeDatasetSnapshotV1(
  snapshot: DatasetSnapshot
): SerializedDatasetSnapshotV1 {
  const files = [...snapshot.files.entries()].sort(([a], [b]) => a.localeCompare(b));
  return { files };
}

type DeserializeOk = { ok: true; snapshot: DatasetSnapshot };

type DeserializeErr = { ok: false; error: string };

export function deserializeDatasetSnapshotV1(input: unknown): DeserializeOk | DeserializeErr {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Expected an object." };
  }
  const record = input as { files?: unknown };
  if (!Array.isArray(record.files)) {
    return { ok: false, error: "Expected files to be an array." };
  }
  const entries: Array<[string, Uint8Array]> = [];
  for (const entry of record.files) {
    if (!Array.isArray(entry) || entry.length !== 2) {
      return { ok: false, error: "Expected file entries to be [path, bytes]." };
    }
    const [path, bytes] = entry;
    if (typeof path !== "string") {
      return { ok: false, error: "Expected file path to be a string." };
    }
    const normalized = normalizeBytes(bytes);
    if (!normalized) {
      return { ok: false, error: "Expected file contents to be a Uint8Array." };
    }
    entries.push([path, normalized]);
  }
  return { ok: true, snapshot: { files: new Map(entries) } };
}

function normalizeBytes(input: unknown): Uint8Array | null {
  if (input instanceof Uint8Array) {
    return input;
  }
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }
  if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  return null;
}
