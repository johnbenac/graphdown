import { createContext, useContext } from "react";
import type {
  DatasetMeta,
  ParsedGraph,
  PersistedUiState,
  RepoSnapshot,
} from "../persistence/types";

export type LoadedDataset = {
  meta: DatasetMeta;
  repoSnapshot: RepoSnapshot;
  parsedGraph: ParsedGraph;
  uiState?: PersistedUiState;
};

export type DatasetState =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "ready"; dataset: LoadedDataset }
  | { status: "error"; message: string };

export type DatasetActions = {
  importDataset: (file: File) => Promise<boolean>;
  clearPersistence: () => Promise<void>;
};

export type DatasetContextValue = {
  state: DatasetState;
  actions: DatasetActions;
};

const DatasetContext = createContext<DatasetContextValue | undefined>(undefined);

export function useDataset() {
  const value = useContext(DatasetContext);
  if (!value) {
    throw new Error("useDataset must be used within DatasetProvider");
  }
  return value;
}

export { DatasetContext };
