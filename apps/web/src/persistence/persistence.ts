import type { PersistStore } from "../storage/PersistStore";
import { KEY } from "./keys";
import { FORMAT_VERSIONS } from "./versions";
import { deserializeGraph, serializeGraph } from "./serializeGraph";
import { deserializeRepoSnapshot, serializeRepoSnapshot } from "./serializeSnapshot";
import type {
  DatasetMeta,
  PersistedParsedGraph,
  PersistedRepoSnapshot,
  PersistedUiState,
  RepoSnapshot,
} from "./types";

export interface Persistence {
  saveDataset(input: {
    datasetId: string;
    meta: DatasetMeta;
    repoSnapshot: RepoSnapshot;
    parsedGraph?: PersistedParsedGraph;
    uiState?: PersistedUiState;
  }): Promise<void>;

  setActiveDatasetId(id: string): Promise<void>;
  getActiveDatasetId(): Promise<string | undefined>;

  loadActiveDataset(): Promise<{
    meta: DatasetMeta;
    repoSnapshot: RepoSnapshot;
    parsedGraph?: PersistedParsedGraph;
    uiState?: PersistedUiState;
  } | undefined>;

  clearAll(): Promise<void>;
  deleteDataset(id: string): Promise<void>;
}

export interface PersistenceOptions {
  parseGraph?: (snapshot: RepoSnapshot) => Promise<PersistedParsedGraph>;
}

export function createPersistence(store: PersistStore, options: PersistenceOptions = {}): Persistence {
  const parseGraph = options.parseGraph;

  const updateDatasetIndex = async (datasetId: string) => {
    const index = (await store.get<string[]>(KEY.datasetIndex)) ?? [];
    if (!index.includes(datasetId)) {
      await store.set(KEY.datasetIndex, [...index, datasetId]);
    }
  };

  const clearActiveDatasetId = async () => {
    await store.del(KEY.activeDatasetId);
  };

  const toMeta = (meta: DatasetMeta): DatasetMeta => ({
    ...meta,
    updatedAt: Date.now(),
    snapshotFormatVersion: FORMAT_VERSIONS.snapshot,
    graphFormatVersion: FORMAT_VERSIONS.graph,
    uiStateFormatVersion: FORMAT_VERSIONS.uiState,
  });

  return {
    async saveDataset({ datasetId, meta, repoSnapshot, parsedGraph, uiState }) {
      try {
        const nextMeta = toMeta(meta);
        await store.set(KEY.datasetMeta(datasetId), nextMeta);
        await store.set(KEY.repoSnapshot(datasetId), serializeRepoSnapshot(repoSnapshot));
        if (parsedGraph) {
          await store.set(KEY.parsedGraph(datasetId), serializeGraph(parsedGraph));
        }
        if (uiState) {
          await store.set(KEY.uiState(datasetId), uiState);
        }
        await updateDatasetIndex(datasetId);
        await store.set(KEY.activeDatasetId, datasetId);
      } catch (err) {
        console.warn("Failed to persist dataset.", err);
      }
    },

    async setActiveDatasetId(id: string) {
      try {
        await store.set(KEY.activeDatasetId, id);
      } catch (err) {
        console.warn("Failed to persist active dataset id.", err);
      }
    },

    async getActiveDatasetId() {
      try {
        return await store.get<string>(KEY.activeDatasetId);
      } catch (err) {
        console.warn("Failed to read active dataset id.", err);
        return undefined;
      }
    },

    async loadActiveDataset() {
      try {
        const activeId = await store.get<string>(KEY.activeDatasetId);
        if (!activeId) {
          return undefined;
        }

        const meta = await store.get<DatasetMeta>(KEY.datasetMeta(activeId));
        const snapshotRaw = await store.get<PersistedRepoSnapshot>(KEY.repoSnapshot(activeId));
        if (!meta || !snapshotRaw) {
          await clearActiveDatasetId();
          return undefined;
        }

        if (meta.snapshotFormatVersion !== FORMAT_VERSIONS.snapshot) {
          await clearActiveDatasetId();
          return undefined;
        }

        const repoSnapshot = deserializeRepoSnapshot(snapshotRaw);
        let parsedGraph = await store.get<PersistedParsedGraph>(KEY.parsedGraph(activeId));

        if (meta.graphFormatVersion !== FORMAT_VERSIONS.graph) {
          parsedGraph = undefined;
        }

        if (!parsedGraph && parseGraph) {
          parsedGraph = serializeGraph(await parseGraph(repoSnapshot));
          await store.set(KEY.parsedGraph(activeId), parsedGraph);
        } else if (parsedGraph) {
          parsedGraph = deserializeGraph(parsedGraph);
        }

        let uiState = await store.get<PersistedUiState>(KEY.uiState(activeId));
        if (meta.uiStateFormatVersion !== FORMAT_VERSIONS.uiState) {
          uiState = undefined;
        }

        return {
          meta,
          repoSnapshot,
          parsedGraph,
          uiState,
        };
      } catch (err) {
        console.warn("Failed to load persisted dataset.", err);
        return undefined;
      }
    },

    async clearAll() {
      try {
        await store.clear();
      } catch (err) {
        console.warn("Failed to clear persistence store.", err);
      }
    },

    async deleteDataset(id: string) {
      try {
        await store.del(KEY.repoSnapshot(id));
        await store.del(KEY.parsedGraph(id));
        await store.del(KEY.uiState(id));
        await store.del(KEY.datasetMeta(id));
        const index = (await store.get<string[]>(KEY.datasetIndex)) ?? [];
        const nextIndex = index.filter((datasetId) => datasetId !== id);
        await store.set(KEY.datasetIndex, nextIndex);
        const activeId = await store.get<string>(KEY.activeDatasetId);
        if (activeId === id) {
          await clearActiveDatasetId();
        }
      } catch (err) {
        console.warn("Failed to delete dataset.", err);
      }
    },
  };
}
