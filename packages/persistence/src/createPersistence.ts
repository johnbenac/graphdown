import type { DatasetSnapshot } from "@graphdown/core";
import { deserializeSnapshot, serializeSnapshot } from "./codec/legacySnapshotCodec";
import {
  deserializeDatasetSnapshotV1,
  serializeDatasetSnapshotV1
} from "./codec/snapshotCodec";
import {
  decodePersistedActiveDatasetV1,
  encodePersistedActiveDatasetV1
} from "./schema/persistedActiveDataset";
import type { DatasetMeta, PersistedDatasetSnapshot, PersistedUiState } from "./types";
import type { PersistStore } from "./store/PersistStore";

const ACTIVE_DATASET_KEY = "active:dataset" as const;
const LEGACY_KEYS = {
  activeMeta: "active:meta",
  activeSnapshot: "active:snapshot",
  activeUiState: "active:uiState"
} as const;

export type Persistence = {
  loadActive(): Promise<{ snapshot: DatasetSnapshot; meta: DatasetMeta; uiState?: PersistedUiState } | null>;
  saveActive(input: {
    snapshot: DatasetSnapshot;
    meta: DatasetMeta;
    uiState?: PersistedUiState;
  }): Promise<void>;
  clearActive(): Promise<void>;
};

export function createPersistence(store: PersistStore): Persistence {
  return {
    async loadActive() {
      const persisted = await store.get(ACTIVE_DATASET_KEY);
      if (persisted !== undefined) {
        const decoded = decodePersistedActiveDatasetV1(persisted);
        if (!decoded.ok) {
          await store.delete(ACTIVE_DATASET_KEY);
        } else {
          const snapshotResult = deserializeDatasetSnapshotV1(decoded.value.snapshot);
          if (!snapshotResult.ok) {
            await store.delete(ACTIVE_DATASET_KEY);
          } else {
            return {
              snapshot: snapshotResult.snapshot,
              meta: decoded.value.meta,
              uiState: decoded.value.uiState
            };
          }
        }
      }

      const meta = await store.get(LEGACY_KEYS.activeMeta);
      const snapshotPayload = await store.get(LEGACY_KEYS.activeSnapshot);
      if (!meta || !snapshotPayload) {
        if (meta) {
          await store.delete(LEGACY_KEYS.activeMeta);
        }
        if (snapshotPayload) {
          await store.delete(LEGACY_KEYS.activeSnapshot);
        }
        return null;
      }
      if (!isDatasetMeta(meta) || !isLegacySnapshot(snapshotPayload)) {
        await store.delete(LEGACY_KEYS.activeMeta);
        await store.delete(LEGACY_KEYS.activeSnapshot);
        return null;
      }
      const datasetSnapshot = deserializeSnapshot(snapshotPayload);
      const uiState = await store.get(LEGACY_KEYS.activeUiState);

      const serialized = serializeDatasetSnapshotV1(datasetSnapshot);
      const record = encodePersistedActiveDatasetV1({
        snapshot: serialized,
        meta,
        uiState: uiState as PersistedUiState | undefined
      });
      await store.set(ACTIVE_DATASET_KEY, record);

      return {
        snapshot: datasetSnapshot,
        meta,
        uiState: uiState as PersistedUiState | undefined
      };
    },
    async saveActive({ snapshot, meta, uiState }) {
      const serialized = serializeDatasetSnapshotV1(snapshot);
      const record = encodePersistedActiveDatasetV1({ snapshot: serialized, meta, uiState });
      await store.set(ACTIVE_DATASET_KEY, record);

      const legacySnapshot: PersistedDatasetSnapshot = serializeSnapshot(snapshot);
      await store.set(LEGACY_KEYS.activeSnapshot, legacySnapshot);
      if (uiState) {
        await store.set(LEGACY_KEYS.activeUiState, uiState);
      }
      await store.set(LEGACY_KEYS.activeMeta, meta);
    },
    async clearActive() {
      await store.delete(ACTIVE_DATASET_KEY);
      await store.delete(LEGACY_KEYS.activeMeta);
      await store.delete(LEGACY_KEYS.activeSnapshot);
      await store.delete(LEGACY_KEYS.activeUiState);
    }
  };
}

function isDatasetMeta(value: unknown): value is DatasetMeta {
  if (!value || typeof value !== "object") {
    return false;
  }
  const meta = value as DatasetMeta;
  return (
    typeof meta.id === "string" &&
    typeof meta.createdAt === "number" &&
    typeof meta.updatedAt === "number"
  );
}

function isLegacySnapshot(value: unknown): value is PersistedDatasetSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }
  const snapshot = value as PersistedDatasetSnapshot;
  if (!Array.isArray(snapshot.files)) {
    return false;
  }
  return snapshot.files.every(
    (entry) =>
      !!entry &&
      typeof entry.path === "string" &&
      isByteArray(entry.contents)
  );
}

function isByteArray(value: unknown): boolean {
  return (
    value instanceof Uint8Array ||
    value instanceof ArrayBuffer ||
    (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(value))
  );
}
