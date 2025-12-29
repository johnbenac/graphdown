import type { Graph, GraphNode, GraphTypeDef } from "../../../../src/core/graph";
import type { RepoSnapshot } from "../../../../src/core/snapshotTypes";

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

export type PersistedRepoSnapshot = {
  files: Array<{ path: string; contents: Uint8Array }>;
};

export type PersistedGraph = {
  nodes: GraphNode[];
  types: GraphTypeDef[];
  outgoing: Array<[string, string[]]>;
  incoming: Array<[string, string[]]>;
};

export type PersistedUiState = Record<string, unknown>;

export type LoadedDataset = {
  meta: DatasetMeta;
  repoSnapshot: RepoSnapshot;
  parsedGraph?: Graph;
  uiState?: PersistedUiState;
};
