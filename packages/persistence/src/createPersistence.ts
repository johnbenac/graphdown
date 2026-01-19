import type { DatasetSnapshot } from "@graphdown/core";
import type { PersistStore } from "./store/PersistStore";
import { KEY } from "./keys";
import { deserializeDatasetSnapshotV1 } from "./codec/snapshotCodec";
import {
  decodePersistedActiveDatasetV1,
  encodePersistedActiveDatasetV1
} from "./schema/persistedActiveDataset";
import type {
  DatasetMeta,
  LoadedDataset,
  PersistedDatasetSnapshot,
  PersistedUiState
} from "./types";

export interface Persistence {
  saveActive(input: {
    meta: DatasetMeta;
    snapshot: DatasetSnapshot;
    uiState?: PersistedUiState;
  }): Promise<void>;
  loadActive(): Promise<LoadedDataset | null>;
  clearActive(): Promise<void>;
}

type CreatePersistenceOptions = {
  store: PersistStore;
};

type LegacyPersistedDatasetSnapshot = PersistedDatasetSnapshot;

function serializeLegacySnapshot(snapshot: DatasetSnapshot): LegacyPersistedDatasetSnapshot {
  return {
    files: [...snapshot.files.entries()].map(([path, contents]) => ({
      path,
      contents
    }))
  };
}

function deserializeLegacySnapshot(snapshot: LegacyPersistedDatasetSnapshot): DatasetSnapshot {
  return {
    files: new Map(snapshot.files.map(({ path, contents }) => [path, contents]))
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createPersistence(options: CreatePersistenceOptions): Persistence {
  const { store } = options;

  return {
    async saveActive({ meta, snapshot, uiState }) {
      const resolvedUiState =
        typeof uiState === "undefined"
          ? (await store.get(KEY.activeUiState))
          : uiState;

      const record = encodePersistedActiveDatasetV1({
        meta,
        snapshot,
        uiState: isRecord(resolvedUiState) ? (resolvedUiState as PersistedUiState) : undefined
      });
      await store.set(KEY.activeDataset, record);

      const persistedSnapshot: PersistedDatasetSnapshot = serializeLegacySnapshot(snapshot);
      await store.set(KEY.activeSnapshot, persistedSnapshot);
      if (uiState) {
        await store.set(KEY.activeUiState, uiState);
      }
      await store.set(KEY.activeMeta, meta);
    },
    async loadActive() {
      const record = await store.get(KEY.activeDataset);
      if (record !== undefined) {
        const decoded = decodePersistedActiveDatasetV1(record);
        if (!decoded.ok) {
          await store.delete(KEY.activeDataset);
          return null;
        }
        const snapshotResult = deserializeDatasetSnapshotV1(decoded.value.snapshot);
        if (!snapshotResult.ok) {
          await store.delete(KEY.activeDataset);
          return null;
        }
        return {
          meta: decoded.value.meta,
          datasetSnapshot: snapshotResult.snapshot,
          uiState: decoded.value.uiState
        };
      }

      const meta = (await store.get(KEY.activeMeta)) as DatasetMeta | undefined;
      const snapshotPayload = (await store.get(
        KEY.activeSnapshot
      )) as PersistedDatasetSnapshot | undefined;
      if (!meta || !snapshotPayload) {
        if (meta) {
          await store.delete(KEY.activeMeta);
        }
        if (snapshotPayload) {
          await store.delete(KEY.activeSnapshot);
        }
        return null;
      }
      const datasetSnapshot = deserializeLegacySnapshot(snapshotPayload);
      const uiState = (await store.get(KEY.activeUiState)) as PersistedUiState | undefined;
      return { meta, datasetSnapshot, uiState };
    },
    async clearActive() {
      await store.delete(KEY.activeMeta);
      await store.delete(KEY.activeSnapshot);
      await store.delete(KEY.activeUiState);
      await store.delete(KEY.activeDataset);
    }
  };
}
