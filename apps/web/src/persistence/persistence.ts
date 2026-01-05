import type { Graph } from "../core/graph";
import type { DatasetSnapshot } from "../core/snapshotTypes";
import type { PersistStore } from "../storage/PersistStore";
import { KEY } from "./keys";
import { serializeGraph, deserializeGraph } from "./serializeGraph";
import { deserializeSnapshot, serializeSnapshot } from "./serializeSnapshot";
import { FORMAT_VERSIONS } from "./versions";
import type {
  DatasetMeta,
  LoadedDataset,
  PersistedGraph,
  PersistedDatasetSnapshot,
  PersistedUiState
} from "./types";

type Logger = {
  warn: (message: string, error?: unknown) => void;
};

export interface Persistence {
  saveActiveDataset(input: {
    meta: DatasetMeta;
    datasetSnapshot: DatasetSnapshot;
    parsedGraph?: Graph;
    uiState?: PersistedUiState;
  }): Promise<void>;
  loadActiveDataset(): Promise<LoadedDataset | undefined>;
  clearActiveDataset(): Promise<void>;
  clearAll(): Promise<void>;
}

type CreatePersistenceOptions = {
  store: PersistStore;
  parseGraph?: (snapshot: DatasetSnapshot) => Promise<Graph>;
  logger?: Logger;
};

function ensureMetaVersions(meta: DatasetMeta): DatasetMeta {
  return {
    ...meta,
    snapshotFormatVersion: meta.snapshotFormatVersion ?? FORMAT_VERSIONS.snapshot,
    graphFormatVersion: meta.graphFormatVersion ?? FORMAT_VERSIONS.graph,
    uiStateFormatVersion: meta.uiStateFormatVersion ?? FORMAT_VERSIONS.uiState
  };
}

export function createPersistence(options: CreatePersistenceOptions): Persistence {
  const { store, parseGraph } = options;
  const logger = options.logger ?? console;

  return {
    async saveActiveDataset({ meta, datasetSnapshot, parsedGraph, uiState }) {
      const persistedSnapshot: PersistedDatasetSnapshot = serializeSnapshot(datasetSnapshot);
      await store.set(KEY.activeSnapshot, persistedSnapshot);
      if (parsedGraph) {
        const persistedGraph: PersistedGraph = serializeGraph(parsedGraph);
        await store.set(KEY.activeGraph, persistedGraph);
      }
      if (uiState) {
        await store.set(KEY.activeUiState, uiState);
      }
      await store.set(KEY.activeMeta, ensureMetaVersions(meta));
    },
    async loadActiveDataset() {
      let meta = await store.get<DatasetMeta>(KEY.activeMeta);
      const snapshotPayload = await store.get<PersistedDatasetSnapshot>(KEY.activeSnapshot);
      if (!meta || !snapshotPayload) {
        await store.del(KEY.activeMeta);
        await store.del(KEY.activeSnapshot);
        return undefined;
      }
      if (meta.snapshotFormatVersion !== FORMAT_VERSIONS.snapshot) {
        await store.del(KEY.activeMeta);
        await store.del(KEY.activeSnapshot);
        logger.warn("Snapshot format mismatch for active dataset; clearing cached data.");
        return undefined;
      }
      const datasetSnapshot = deserializeSnapshot(snapshotPayload);
      let parsedGraph: Graph | undefined;
      const storedGraph = await store.get<PersistedGraph>(KEY.activeGraph);
      if (storedGraph && meta.graphFormatVersion === FORMAT_VERSIONS.graph) {
        parsedGraph = deserializeGraph(storedGraph);
      } else if (parseGraph) {
        try {
          parsedGraph = await parseGraph(datasetSnapshot);
          await store.set(KEY.activeGraph, serializeGraph(parsedGraph));
          const updatedMeta = {
            ...meta,
            graphFormatVersion: FORMAT_VERSIONS.graph,
            updatedAt: Date.now()
          };
          await store.set(KEY.activeMeta, updatedMeta);
          meta = updatedMeta;
        } catch (error) {
          logger.warn("Failed to rebuild graph from snapshot; continuing without cached graph.", error);
        }
      }
      let uiState = await store.get<PersistedUiState>(KEY.activeUiState);
      if (uiState && meta.uiStateFormatVersion !== FORMAT_VERSIONS.uiState) {
        uiState = undefined;
        await store.del(KEY.activeUiState);
      }
      return { meta, datasetSnapshot, parsedGraph, uiState };
    },
    async clearActiveDataset() {
      await store.del(KEY.activeMeta);
      await store.del(KEY.activeSnapshot);
      await store.del(KEY.activeGraph);
      await store.del(KEY.activeUiState);
    },
    async clearAll() {
      await store.clear();
    }
  };
}
