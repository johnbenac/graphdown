export type RepoSnapshot = {
  files: Map<string, Uint8Array>;
};

export type PersistedRepoSnapshot = {
  files: Array<[string, Uint8Array]>;
};

export type GraphNode = {
  id: string;
  file: string;
};

export type ParsedGraph = {
  nodes: GraphNode[];
  edges: Array<[string, string]>;
};

export type PersistedParsedGraph = ParsedGraph;

export type PersistedUiState = Record<string, unknown>;

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
