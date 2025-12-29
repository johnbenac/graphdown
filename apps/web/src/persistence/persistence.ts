import type { Graph, RepoSnapshot } from "@graphdown/core";
import type { PersistStore } from "../storage/PersistStore";
import { KEY } from "./keys";
import { deserializeGraph, serializeGraph, type PersistedGraph } from "./serializeGraph";
import {
  deserializeRepoSnapshot,
  serializeRepoSnapshot,
  type PersistedRepoSnapshot,
} from "./serializeSnapshot";
import { FORMAT_VERSIONS } from "./versions";

export type DatasetMeta = {
  id: string;
  createdAt: number;
  updatedAt: number;
  snapshotFormatVersion: number;
  graphFormatVersion: number;
  uiStateFormatVersion: number;
  label?: string;
  source?: string;
};

export type PersistedUiState = Record<string, unknown>;

export interface PersistenceDataset {
  meta: DatasetMeta;
  repoSnapshot: RepoSnapshot;
  parsedGraph?: Graph;
  uiState?: PersistedUiState;
}

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
  loadActiveDataset(): Promise<PersistenceDataset | undefined>;
  clearAll(): Promise<void>;
  deleteDataset(id: string): Promise<void>;
}

interface PersistenceOptions {
  parseGraph: (snapshot: RepoSnapshot) => Graph;
  now?: () => number;
  logger?: Pick<Console, "warn">;
}

function resolveNow(now?: () => number): number {
  return (now ?? Date.now)();
}

export function createDatasetMeta(input: {
  id: string;
  label?: string;
  source?: string;
  now?: () => number;
}): DatasetMeta {
  const timestamp = resolveNow(input.now);
  return {
    id: input.id,
    createdAt: timestamp,
    updatedAt: timestamp,
    snapshotFormatVersion: FORMAT_VERSIONS.snapshot,
    graphFormatVersion: FORMAT_VERSIONS.graph,
    uiStateFormatVersion: FORMAT_VERSIONS.uiState,
    label: input.label,
    source: input.source,
  };
}

export function createPersistence(store: PersistStore, options: PersistenceOptions): Persistence {
  const logger = options.logger ?? console;

  const setActiveDatasetId = async (id: string) => {
    await store.set(KEY.activeDatasetId, id);
  };

  const getActiveDatasetId = async () => store.get<string>(KEY.activeDatasetId);

  const saveDataset: Persistence["saveDataset"] = async ({
    datasetId,
    meta,
    repoSnapshot,
    parsedGraph,
    uiState,
  }) => {
    const updatedMeta: DatasetMeta = {
      ...meta,
      updatedAt: resolveNow(options.now),
      snapshotFormatVersion: FORMAT_VERSIONS.snapshot,
      graphFormatVersion: FORMAT_VERSIONS.graph,
      uiStateFormatVersion: FORMAT_VERSIONS.uiState,
    };

    await store.set(KEY.datasetMeta(datasetId), updatedMeta);
    await store.set(KEY.repoSnapshot(datasetId), serializeRepoSnapshot(repoSnapshot));
    if (parsedGraph) {
      await store.set(KEY.parsedGraph(datasetId), serializeGraph(parsedGraph));
    }
    if (uiState) {
      await store.set(KEY.uiState(datasetId), uiState);
    }
    await setActiveDatasetId(datasetId);
  };

  const loadActiveDataset: Persistence["loadActiveDataset"] = async () => {
    try {
      const activeId = await getActiveDatasetId();
      if (!activeId) {
        return undefined;
      }

      const meta = await store.get<DatasetMeta>(KEY.datasetMeta(activeId));
      const rawSnapshot = await store.get<PersistedRepoSnapshot>(KEY.repoSnapshot(activeId));
      if (!meta || !rawSnapshot) {
        await store.del(KEY.activeDatasetId);
        return undefined;
      }

      if (meta.snapshotFormatVersion !== FORMAT_VERSIONS.snapshot) {
        await deleteDataset(activeId);
        return undefined;
      }

      const repoSnapshot = deserializeRepoSnapshot(rawSnapshot);
      let parsedGraph: Graph | undefined;
      let updatedMeta = meta;
      const rawGraph = await store.get<PersistedGraph>(KEY.parsedGraph(activeId));

      if (rawGraph && meta.graphFormatVersion === FORMAT_VERSIONS.graph) {
        parsedGraph = deserializeGraph(rawGraph);
      } else {
        try {
          parsedGraph = options.parseGraph(repoSnapshot);
          await store.set(KEY.parsedGraph(activeId), serializeGraph(parsedGraph));
          if (meta.graphFormatVersion !== FORMAT_VERSIONS.graph) {
            updatedMeta = {
              ...meta,
              graphFormatVersion: FORMAT_VERSIONS.graph,
              updatedAt: resolveNow(options.now),
            };
            await store.set(KEY.datasetMeta(activeId), updatedMeta);
          }
        } catch (error) {
          logger.warn("Failed to parse stored snapshot; clearing dataset.", error);
          await deleteDataset(activeId);
          return undefined;
        }
      }

      let uiState = await store.get<PersistedUiState>(KEY.uiState(activeId));
      if (uiState && meta.uiStateFormatVersion !== FORMAT_VERSIONS.uiState) {
        uiState = undefined;
      }

      return {
        meta: updatedMeta,
        repoSnapshot,
        parsedGraph,
        uiState,
      };
    } catch (error) {
      logger.warn("Failed to load persisted dataset.", error);
      await store.del(KEY.activeDatasetId);
      return undefined;
    }
  };

  const deleteDataset: Persistence["deleteDataset"] = async (id) => {
    const activeId = await getActiveDatasetId();
    if (activeId === id) {
      await store.del(KEY.activeDatasetId);
    }
    await store.del(KEY.datasetMeta(id));
    await store.del(KEY.repoSnapshot(id));
    await store.del(KEY.parsedGraph(id));
    await store.del(KEY.uiState(id));
  };

  const clearAll = async () => {
    await store.clear();
  };

  return {
    saveDataset,
    setActiveDatasetId,
    getActiveDatasetId,
    loadActiveDataset,
    clearAll,
    deleteDataset,
  };
}
