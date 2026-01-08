import type { RecordLinkGraph } from "../graphdown";
import type { DatasetSnapshot } from "../graphdown";
import type { PersistStore } from "../storage/PersistStore";
import { KEY } from "./keys";
import {
  serializeRecordLinkGraphCache,
  deserializeRecordLinkGraphCache
} from "./serializeRecordLinkGraphCache";
import { deserializeSnapshot, serializeSnapshot } from "./serializeSnapshot";
import type {
  DatasetMeta,
  LoadedDataset,
  PersistedRecordLinkGraphCache,
  PersistedDatasetSnapshot,
  PersistedUiState
} from "./types";

export interface Persistence {
  saveActiveDataset(input: {
    meta: DatasetMeta;
    datasetSnapshot: DatasetSnapshot;
    recordLinkGraph?: RecordLinkGraph;
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
    async saveActiveDataset({ meta, datasetSnapshot, recordLinkGraph, uiState }) {
      const persistedSnapshot: PersistedDatasetSnapshot = serializeSnapshot(datasetSnapshot);
      await store.set(KEY.activeSnapshot, persistedSnapshot);
      if (recordLinkGraph) {
        const persistedGraph: PersistedRecordLinkGraphCache = serializeRecordLinkGraphCache(recordLinkGraph);
        await store.set(KEY.activeRecordLinkGraphCache, persistedGraph);
      }
      if (uiState) {
        await store.set(KEY.activeUiState, uiState);
      }
      await store.set(KEY.activeMeta, meta);
    },
    async loadActiveDataset() {
      const meta = await store.get<DatasetMeta>(KEY.activeMeta);
      const snapshotPayload = await store.get<PersistedDatasetSnapshot>(KEY.activeSnapshot);
      const storedGraph = await store.get<PersistedRecordLinkGraphCache>(KEY.activeRecordLinkGraphCache);
      if (!meta || !snapshotPayload || !storedGraph) {
        await store.del(KEY.activeMeta);
        await store.del(KEY.activeSnapshot);
        await store.del(KEY.activeRecordLinkGraphCache);
        await store.del(KEY.activeUiState);
        return undefined;
      }
      const datasetSnapshot = deserializeSnapshot(snapshotPayload);
      const recordLinkGraph = deserializeRecordLinkGraphCache(storedGraph);
      const uiState = await store.get<PersistedUiState>(KEY.activeUiState);
      return { meta, datasetSnapshot, recordLinkGraph, uiState };
    },
    async clearActiveDataset() {
      await store.del(KEY.activeMeta);
      await store.del(KEY.activeSnapshot);
      await store.del(KEY.activeRecordLinkGraphCache);
      await store.del(KEY.activeUiState);
    },
    async clearAll() {
      await store.clear();
    }
  };
}
