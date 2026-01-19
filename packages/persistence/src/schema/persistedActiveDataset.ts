import type { DatasetSnapshot } from "@graphdown/core";
import {
  deserializeDatasetSnapshotV1,
  serializeDatasetSnapshotV1,
  type SerializedDatasetSnapshotV1
} from "../codec/snapshotCodec";
import type { DatasetMeta, PersistedUiState } from "../types";

export const PERSISTED_ACTIVE_DATASET_VERSION = 1 as const;

export type PersistedActiveDatasetV1 = {
  version: typeof PERSISTED_ACTIVE_DATASET_VERSION;
  snapshot: SerializedDatasetSnapshotV1;
  meta: DatasetMeta;
  uiState?: PersistedUiState;
};

type PersistedActiveDatasetInput = {
  snapshot: DatasetSnapshot;
  meta: DatasetMeta;
  uiState?: PersistedUiState;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMeta(value: unknown): value is DatasetMeta {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    typeof value.createdAt === "number" &&
    typeof value.updatedAt === "number"
  );
}

function isUiState(value: unknown): value is PersistedUiState {
  return isRecord(value);
}

export function encodePersistedActiveDatasetV1(
  input: PersistedActiveDatasetInput
): PersistedActiveDatasetV1 {
  return {
    version: PERSISTED_ACTIVE_DATASET_VERSION,
    snapshot: serializeDatasetSnapshotV1(input.snapshot),
    meta: input.meta,
    uiState: input.uiState
  };
}

export function decodePersistedActiveDatasetV1(
  input: unknown
): { ok: true; value: PersistedActiveDatasetV1 } | { ok: false; error: string } {
  if (!isRecord(input)) {
    return { ok: false, error: "Persisted dataset must be an object." };
  }
  if (input.version !== PERSISTED_ACTIVE_DATASET_VERSION) {
    return { ok: false, error: "Persisted dataset version is invalid." };
  }
  if (!isMeta(input.meta)) {
    return { ok: false, error: "Persisted dataset meta is invalid." };
  }
  const snapshotResult = deserializeDatasetSnapshotV1(input.snapshot);
  if (!snapshotResult.ok) {
    return { ok: false, error: snapshotResult.error };
  }
  if ("uiState" in input && typeof input.uiState !== "undefined") {
    if (!isUiState(input.uiState)) {
      return { ok: false, error: "Persisted dataset uiState is invalid." };
    }
  }
  return {
    ok: true,
    value: {
      version: PERSISTED_ACTIVE_DATASET_VERSION,
      snapshot: input.snapshot as SerializedDatasetSnapshotV1,
      meta: input.meta,
      uiState: input.uiState as PersistedUiState | undefined
    }
  };
}
