import type { PersistStore } from "../storage/PersistStore";
import { KEY } from "./keys";
import { deserializeGraph, serializeGraph } from "./serializeGraph";
import { FORMAT_VERSIONS } from "./versions";
import type {
  DatasetMeta,
  ParsedGraph,
  PersistedParsedGraph,
  PersistedUiState,
  RepoSnapshot,
} from "./types";

export interface Persistence {
  saveDataset(input: {
    datasetId: string;
    meta: DatasetMeta;
    repoSnapshot: RepoSnapshot;
    parsedGraph?: ParsedGraph;
    uiState?: PersistedUiState;
  }): Promise<void>;
  setActiveDatasetId(id: string): Promise<void>;
  getActiveDatasetId(): Promise<string | undefined>;
  loadActiveDataset(): Promise<{
    meta: DatasetMeta;
    repoSnapshot: RepoSnapshot;
    parsedGraph?: ParsedGraph;
    uiState?: PersistedUiState;
  } | undefined>;
  clearAll(): Promise<void>;
  deleteDataset(id: string): Promise<void>;
}

export function createPersistence(store: PersistStore): Persistence {
  const setActiveDatasetId = async (id: string) => {
    await store.set(KEY.activeDatasetId, id);
  };

  const getActiveDatasetId = async () => {
    return store.get<string>(KEY.activeDatasetId);
  };

  const saveDataset = async (input: {
    datasetId: string;
    meta: DatasetMeta;
    repoSnapshot: RepoSnapshot;
    parsedGraph?: ParsedGraph;
    uiState?: PersistedUiState;
  }) => {
    const { datasetId, meta, repoSnapshot, parsedGraph, uiState } = input;

    await store.set(KEY.datasetMeta(datasetId), meta);
    await store.set(KEY.repoSnapshot(datasetId), repoSnapshot);
    if (parsedGraph) {
      await store.set(KEY.parsedGraph(datasetId), serializeGraph(parsedGraph));
    }
    if (uiState) {
      await store.set(KEY.uiState(datasetId), uiState);
    }

    const datasetIndex = (await store.get<string[]>(KEY.datasetIndex)) ?? [];
    if (!datasetIndex.includes(datasetId)) {
      await store.set(KEY.datasetIndex, [...datasetIndex, datasetId]);
    }
  };

  const loadActiveDataset = async () => {
    const datasetId = await getActiveDatasetId();
    if (!datasetId) {
      return undefined;
    }

    const [meta, repoSnapshot] = await Promise.all([
      store.get<DatasetMeta>(KEY.datasetMeta(datasetId)),
      store.get<RepoSnapshot>(KEY.repoSnapshot(datasetId)),
    ]);

    if (!meta || !repoSnapshot) {
      await store.del(KEY.activeDatasetId);
      return undefined;
    }

    if (meta.snapshotFormatVersion !== FORMAT_VERSIONS.snapshot) {
      await store.del(KEY.activeDatasetId);
      return undefined;
    }

    let parsedGraph: ParsedGraph | undefined;
    const rawGraph = await store.get<PersistedParsedGraph>(KEY.parsedGraph(datasetId));
    if (rawGraph && meta.graphFormatVersion === FORMAT_VERSIONS.graph) {
      parsedGraph = deserializeGraph(rawGraph);
    } else if (rawGraph) {
      await store.del(KEY.parsedGraph(datasetId));
    }

    let uiState: PersistedUiState | undefined;
    const rawUiState = await store.get<PersistedUiState>(KEY.uiState(datasetId));
    if (rawUiState && meta.uiStateFormatVersion === FORMAT_VERSIONS.uiState) {
      uiState = rawUiState;
    } else if (rawUiState) {
      await store.del(KEY.uiState(datasetId));
    }

    return { meta, repoSnapshot, parsedGraph, uiState };
  };

  const clearAll = async () => {
    await store.clear();
  };

  const deleteDataset = async (datasetId: string) => {
    await Promise.all([
      store.del(KEY.datasetMeta(datasetId)),
      store.del(KEY.repoSnapshot(datasetId)),
      store.del(KEY.parsedGraph(datasetId)),
      store.del(KEY.uiState(datasetId)),
    ]);

    const datasetIndex = (await store.get<string[]>(KEY.datasetIndex)) ?? [];
    if (datasetIndex.includes(datasetId)) {
      await store.set(
        KEY.datasetIndex,
        datasetIndex.filter((id) => id !== datasetId),
      );
    }

    const activeId = await store.get<string>(KEY.activeDatasetId);
    if (activeId === datasetId) {
      await store.del(KEY.activeDatasetId);
    }
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
