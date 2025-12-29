import type { Graph } from "../../../../src/core/graph";
import type { RepoSnapshot } from "../../../../src/core/snapshotTypes";
import type { PersistStore } from "../storage/PersistStore";
import { KEY } from "./keys";
import { serializeGraph, deserializeGraph } from "./serializeGraph";
import { deserializeSnapshot, serializeSnapshot } from "./serializeSnapshot";
import { FORMAT_VERSIONS } from "./versions";
import type {
  DatasetMeta,
  LoadedDataset,
  PersistedGraph,
  PersistedRepoSnapshot,
  PersistedUiState
} from "./types";

type Logger = {
  warn: (message: string, error?: unknown) => void;
};

export interface Persistence {
  saveDataset(input: {
    datasetId: string;
    meta: DatasetMeta;
    repoSnapshot: RepoSnapshot;
    parsedGraph?: Graph;
    uiState?: PersistedUiState;
  }): Promise<void>;
  setActiveDatasetId(id: string): Promise<void>;
  getActiveDatasetId(): Promise<string | undefined>;
  loadActiveDataset(): Promise<LoadedDataset | undefined>;
  clearAll(): Promise<void>;
  deleteDataset(id: string): Promise<void>;
}

type CreatePersistenceOptions = {
  store: PersistStore;
  parseGraph?: (snapshot: RepoSnapshot) => Promise<Graph>;
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

  async function updateDatasetIndex(id: string, remove = false) {
    const index = (await store.get<string[]>(KEY.datasetIndex)) ?? [];
    const next = new Set(index);
    if (remove) {
      next.delete(id);
    } else {
      next.add(id);
    }
    await store.set(KEY.datasetIndex, [...next]);
  }

  return {
    async saveDataset({ datasetId, meta, repoSnapshot, parsedGraph, uiState }) {
      const persistedSnapshot: PersistedRepoSnapshot = serializeSnapshot(repoSnapshot);
      await store.set(KEY.repoSnapshot(datasetId), persistedSnapshot);
      if (parsedGraph) {
        const persistedGraph: PersistedGraph = serializeGraph(parsedGraph);
        await store.set(KEY.parsedGraph(datasetId), persistedGraph);
      }
      if (uiState) {
        await store.set(KEY.uiState(datasetId), uiState);
      }
      await store.set(KEY.datasetMeta(datasetId), ensureMetaVersions(meta));
      await updateDatasetIndex(datasetId);
    },
    async setActiveDatasetId(id: string) {
      await store.set(KEY.activeDatasetId, id);
    },
    async getActiveDatasetId() {
      return store.get<string>(KEY.activeDatasetId);
    },
    async loadActiveDataset() {
      const activeId = await store.get<string>(KEY.activeDatasetId);
      if (!activeId) {
        return undefined;
      }
      const meta = await store.get<DatasetMeta>(KEY.datasetMeta(activeId));
      const snapshotPayload = await store.get<PersistedRepoSnapshot>(KEY.repoSnapshot(activeId));
      if (!meta || !snapshotPayload) {
        await store.del(KEY.activeDatasetId);
        return undefined;
      }
      if (meta.snapshotFormatVersion !== FORMAT_VERSIONS.snapshot) {
        await store.del(KEY.activeDatasetId);
        logger.warn(`Snapshot format mismatch for dataset ${activeId}; clearing active dataset.`);
        return undefined;
      }
      const repoSnapshot = deserializeSnapshot(snapshotPayload);
      let parsedGraph: Graph | undefined;
      const storedGraph = await store.get<PersistedGraph>(KEY.parsedGraph(activeId));
      if (storedGraph && meta.graphFormatVersion === FORMAT_VERSIONS.graph) {
        parsedGraph = deserializeGraph(storedGraph);
      } else if (parseGraph) {
        try {
          parsedGraph = await parseGraph(repoSnapshot);
          await store.set(KEY.parsedGraph(activeId), serializeGraph(parsedGraph));
          const updatedMeta = {
            ...meta,
            graphFormatVersion: FORMAT_VERSIONS.graph,
            updatedAt: Date.now()
          };
          await store.set(KEY.datasetMeta(activeId), updatedMeta);
        } catch (error) {
          logger.warn("Failed to rebuild graph from snapshot; continuing without cached graph.", error);
        }
      }
      let uiState = await store.get<PersistedUiState>(KEY.uiState(activeId));
      if (uiState && meta.uiStateFormatVersion !== FORMAT_VERSIONS.uiState) {
        uiState = undefined;
        await store.del(KEY.uiState(activeId));
      }
      return { meta, repoSnapshot, parsedGraph, uiState };
    },
    async clearAll() {
      await store.clear();
    },
    async deleteDataset(id: string) {
      await store.del(KEY.datasetMeta(id));
      await store.del(KEY.repoSnapshot(id));
      await store.del(KEY.parsedGraph(id));
      await store.del(KEY.uiState(id));
      await updateDatasetIndex(id, true);
      const activeId = await store.get<string>(KEY.activeDatasetId);
      if (activeId === id) {
        await store.del(KEY.activeDatasetId);
      }
    }
  };
}
