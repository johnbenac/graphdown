export type RepoSnapshot = {
  fileName: string;
  bytes: number[];
  importedAt: number;
};

export type ParsedGraph = {
  nodeCount: number;
  edgeCount: number;
  summary: string;
};

export type PersistedParsedGraph = ParsedGraph;

export type PersistedUiState = {
  selectedNodeId?: string;
  filters?: Record<string, unknown>;
};

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
