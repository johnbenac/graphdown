import { deserializeDatasetSnapshotV1, type SerializedDatasetSnapshotV1 } from "../codec/snapshotCodec";
import type { DatasetMeta, ImportReport, PersistedUiState } from "../types";

export const PERSISTED_ACTIVE_DATASET_VERSION = 1 as const;

export type PersistedActiveDatasetV1 = {
  version: typeof PERSISTED_ACTIVE_DATASET_VERSION;
  snapshot: SerializedDatasetSnapshotV1;
  meta: DatasetMeta;
  uiState?: PersistedUiState;
};

type DecodeResult<T> = { ok: true; value: T } | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isImportReport(value: unknown): value is ImportReport {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.ignoredFileCount === "number" &&
    Array.isArray(value.ignoredFileSample) &&
    value.ignoredFileSample.every((entry) => typeof entry === "string") &&
    typeof value.droppedBlockCount === "number" &&
    Array.isArray(value.droppedBlockSample) &&
    value.droppedBlockSample.every((entry) => typeof entry === "string")
  );
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

export function encodePersistedActiveDatasetV1(input: {
  snapshot: SerializedDatasetSnapshotV1;
  meta: DatasetMeta;
  uiState?: PersistedUiState;
}): PersistedActiveDatasetV1 {
  return {
    version: PERSISTED_ACTIVE_DATASET_VERSION,
    snapshot: input.snapshot,
    meta: input.meta,
    ...(input.uiState ? { uiState: input.uiState } : {})
  };
}

export function decodePersistedActiveDatasetV1(input: unknown): DecodeResult<PersistedActiveDatasetV1> {
  if (!isRecord(input)) {
    return { ok: false, error: "Persisted dataset must be an object." };
  }
  if (input.version !== PERSISTED_ACTIVE_DATASET_VERSION) {
    return { ok: false, error: "Persisted dataset version is invalid." };
  }
  if (!("snapshot" in input)) {
    return { ok: false, error: "Persisted dataset snapshot is missing." };
  }
  const snapshotPayload = input.snapshot as SerializedDatasetSnapshotV1;
  const snapshotValidation = deserializeDatasetSnapshotV1(snapshotPayload);
  if (!snapshotValidation.ok) {
    return { ok: false, error: `Persisted dataset snapshot is invalid: ${snapshotValidation.error}` };
  }
  if (!isDatasetMeta(input.meta)) {
    return { ok: false, error: "Persisted dataset metadata is invalid." };
  }
  return {
    ok: true,
    value: {
      version: PERSISTED_ACTIVE_DATASET_VERSION,
      snapshot: snapshotPayload,
      meta: input.meta,
      ...(input.uiState ? { uiState: input.uiState as PersistedUiState } : {})
    }
  };
}
