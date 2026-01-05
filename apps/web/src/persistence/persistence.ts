import type { Graph } from "../core/graph";
import type { DatasetSnapshot } from "../core/snapshotTypes";
import type { PersistStore } from "../storage/PersistStore";
import { KEY } from "./keys";
import { deserializeGraph, serializeGraph } from "./serializeGraph";
import { deserializeSnapshot, serializeSnapshot } from "./serializeSnapshot";
import { FORMAT_VERSIONS } from "./versions";
import type {
  DatasetMeta,
  LoadedDataset,
  PersistedDatasetSnapshot,
  PersistedGraph,
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
      await store.set(KEY.datasetSnapshot, persistedSnapshot);
      if (parsedGraph) {
        const persistedGraph: PersistedGraph = serializeGraph(parsedGraph);
        await store.set(KEY.parsedGraph, persistedGraph);
      }
      if (uiState) {
        await store.set(KEY.uiState, uiState);
      }
      await store.set(KEY.meta, ensureMetaVersions(meta));
    },
    async loadActiveDataset() {
      const meta = await store.get<DatasetMeta>(KEY.meta);
      const snapshotPayload = await store.get<PersistedDatasetSnapshot>(KEY.datasetSnapshot);
      if (!meta || !snapshotPayload) {
        await store.del(KEY.meta);
        await store.del(KEY.datasetSnapshot);
        await store.del(KEY.parsedGraph);
        await store.del(KEY.uiState);
        return undefined;
      }
      if (meta.snapshotFormatVersion !== FORMAT_VERSIONS.snapshot) {
        await store.del(KEY.meta);
        await store.del(KEY.datasetSnapshot);
        await store.del(KEY.parsedGraph);
        await store.del(KEY.uiState);
        logger.warn("Snapshot format mismatch; clearing active dataset.");
        return undefined;
      }
      const datasetSnapshot = deserializeSnapshot(snapshotPayload);
      let parsedGraph: Graph | undefined;
      const storedGraph = await store.get<PersistedGraph>(KEY.parsedGraph);
      if (storedGraph && meta.graphFormatVersion === FORMAT_VERSIONS.graph) {
        parsedGraph = deserializeGraph(storedGraph);
      } else if (parseGraph) {
        try {
          parsedGraph = await parseGraph(datasetSnapshot);
          await store.set(KEY.parsedGraph, serializeGraph(parsedGraph));
          const updatedMeta = {
            ...meta,
            graphFormatVersion: FORMAT_VERSIONS.graph,
            updatedAt: Date.now()
          };
          await store.set(KEY.meta, updatedMeta);
        } catch (error) {
          logger.warn("Failed to rebuild graph from snapshot; continuing without cached graph.", error);
        }
      }
      let uiState = await store.get<PersistedUiState>(KEY.uiState);
      if (uiState && meta.uiStateFormatVersion !== FORMAT_VERSIONS.uiState) {
        uiState = undefined;
        await store.del(KEY.uiState);
      }
      return { meta, datasetSnapshot, parsedGraph, uiState };
    },
    async clearActiveDataset() {
      await store.del(KEY.meta);
      await store.del(KEY.datasetSnapshot);
      await store.del(KEY.parsedGraph);
      await store.del(KEY.uiState);
    }
  };
}
