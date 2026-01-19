import type { DatasetSnapshot } from "@graphdown/core";
import {
  deserializeDatasetSnapshotV1,
  serializeDatasetSnapshotV1
} from "./codec/snapshotCodec";
import {
  decodePersistedActiveDatasetV1,
  encodePersistedActiveDatasetV1,
  type PersistedDatasetMetaV1
} from "./schema/persistedActiveDataset";
import type { DatasetMeta, LoadedDataset } from "./types";
import type { PersistStore } from "./store/PersistStore";

const ACTIVE_DATASET_KEY = "active:dataset";

export type Persistence = {
  loadActive(): Promise<LoadedDataset | null>;
  saveActive(input: { snapshot: DatasetSnapshot; meta: DatasetMeta }): Promise<void>;
  clearActive(): Promise<void>;
};

export function createPersistence(store: PersistStore): Persistence {
  return {
    async loadActive() {
      const raw = await store.get(ACTIVE_DATASET_KEY);
      if (raw === undefined) {
        return null;
      }
      const decoded = decodePersistedActiveDatasetV1(raw);
      if (!decoded.ok) {
        await store.delete(ACTIVE_DATASET_KEY);
        return null;
      }
      const snapshotResult = deserializeDatasetSnapshotV1(decoded.value.snapshot);
      if (!snapshotResult.ok) {
        await store.delete(ACTIVE_DATASET_KEY);
        return null;
      }
      const updatedAt = Date.parse(decoded.value.meta.updatedAt);
      if (!Number.isFinite(updatedAt)) {
        await store.delete(ACTIVE_DATASET_KEY);
        return null;
      }
      return {
        snapshot: snapshotResult.snapshot,
        meta: {
          id: decoded.value.meta.id,
          createdAt: decoded.value.meta.createdAt,
          updatedAt,
          label: decoded.value.meta.label,
          source: decoded.value.meta.source,
          importReport: decoded.value.meta.importReport
        }
      };
    },
    async saveActive({ snapshot, meta }) {
      const persistedMeta: PersistedDatasetMetaV1 = {
        id: meta.id,
        createdAt: meta.createdAt,
        updatedAt: new Date(meta.updatedAt).toISOString(),
        label: meta.label,
        source: meta.source,
        importReport: meta.importReport
      };
      const payload = encodePersistedActiveDatasetV1({
        snapshot: serializeDatasetSnapshotV1(snapshot),
        meta: persistedMeta
      });
      await store.set(ACTIVE_DATASET_KEY, payload);
    },
    async clearActive() {
      await store.delete(ACTIVE_DATASET_KEY);
    }
  };
}
