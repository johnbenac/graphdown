import type { DatasetSnapshot } from "@graphdown/core";
import type { PersistStore } from "../storage/PersistStore";
import { KEY } from "./keys";
import { deserializeSnapshot, serializeSnapshot } from "./serializeSnapshot";
import type {
  DatasetMeta,
  LoadedDataset,
  PersistedDatasetSnapshot,
  PersistedUiState
} from "./types";

export interface Persistence {
  saveActiveDataset(input: {
    meta: DatasetMeta;
    datasetSnapshot: DatasetSnapshot;
    uiState?: PersistedUiState;
  }): Promise<void>;
  loadActiveDataset(): Promise<LoadedDataset | undefined>;
  clearActiveDataset(): Promise<void>;
  clearAll(): Promise<void>;
}

type CreatePersistenceOptions = {
  store: PersistStore;
};

export function createPersistence(options: CreatePersistenceOptions): Persistence {
  const { store } = options;

  return {
    async saveActiveDataset({ meta, datasetSnapshot, uiState }) {
      const persistedSnapshot: PersistedDatasetSnapshot = serializeSnapshot(datasetSnapshot);
      await store.set(KEY.activeSnapshot, persistedSnapshot);
      if (uiState) {
        await store.set(KEY.activeUiState, uiState);
      }
      await store.set(KEY.activeMeta, meta);
    },
    async loadActiveDataset() {
      const meta = await store.get<DatasetMeta>(KEY.activeMeta);
      const snapshotPayload = await store.get<PersistedDatasetSnapshot>(KEY.activeSnapshot);
      if (!meta || !snapshotPayload) {
        if (meta) {
          await store.del(KEY.activeMeta);
        }
        if (snapshotPayload) {
          await store.del(KEY.activeSnapshot);
        }
        return undefined;
      }
      const datasetSnapshot = deserializeSnapshot(snapshotPayload);
      const uiState = await store.get<PersistedUiState>(KEY.activeUiState);
      return { meta, datasetSnapshot, uiState };
    },
    async clearActiveDataset() {
      await store.del(KEY.activeMeta);
      await store.del(KEY.activeSnapshot);
      await store.del(KEY.activeUiState);
    },
    async clearAll() {
      await store.clear();
    }
  };
}
