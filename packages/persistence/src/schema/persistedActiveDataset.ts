import { deserializeDatasetSnapshotV1 } from "../codec/snapshotCodec";
import type { SerializedDatasetSnapshotV1 } from "../codec/snapshotCodec";
import type { DatasetMeta, ImportReport, PersistedUiState } from "../types";

export const PERSISTED_ACTIVE_DATASET_VERSION = 1 as const;

export type PersistedActiveDatasetV1 = {
  version: typeof PERSISTED_ACTIVE_DATASET_VERSION;
  snapshot: SerializedDatasetSnapshotV1;
  meta: DatasetMeta;
  uiState?: PersistedUiState;
};

export function encodePersistedActiveDatasetV1(input: {
  snapshot: SerializedDatasetSnapshotV1;
  meta: DatasetMeta;
  uiState?: PersistedUiState;
}): PersistedActiveDatasetV1 {
  return {
    version: PERSISTED_ACTIVE_DATASET_VERSION,
    snapshot: input.snapshot,
    meta: input.meta,
    uiState: input.uiState
  };
}

export function decodePersistedActiveDatasetV1(
  input: unknown
): { ok: true; value: PersistedActiveDatasetV1 } | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Persisted dataset must be an object." };
  }
  const record = input as PersistedActiveDatasetV1;
  if (record.version !== PERSISTED_ACTIVE_DATASET_VERSION) {
    return { ok: false, error: "Persisted dataset version is invalid." };
  }
  const snapshotResult = deserializeDatasetSnapshotV1(record.snapshot);
  if (!snapshotResult.ok) {
    return { ok: false, error: `Persisted snapshot invalid: ${snapshotResult.error}` };
  }
  const meta = record.meta;
  if (!isDatasetMeta(meta)) {
    return { ok: false, error: "Persisted meta is invalid." };
  }
  return { ok: true, value: record };
}

function isDatasetMeta(value: unknown): value is DatasetMeta {
  if (!isRecord(value)) {
    return false;
  }
  if (typeof value.id !== "string") {
    return false;
  }
  if (typeof value.createdAt !== "number" || typeof value.updatedAt !== "number") {
    return false;
  }
  if (value.label !== undefined && typeof value.label !== "string") {
    return false;
  }
  if (value.source !== undefined && typeof value.source !== "string") {
    return false;
  }
  if (value.importReport !== undefined && !isImportReport(value.importReport)) {
    return false;
  }
  return true;
}

function isImportReport(value: unknown): value is ImportReport {
  if (!isRecord(value)) {
    return false;
  }
  if (typeof value.ignoredFileCount !== "number") {
    return false;
  }
  if (!isStringArray(value.ignoredFileSample)) {
    return false;
  }
  if (typeof value.droppedBlockCount !== "number") {
    return false;
  }
  if (!isStringArray(value.droppedBlockSample)) {
    return false;
  }
  return true;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
