import type { Graph, GraphRecordNode, GraphTypeNode } from "../graphdown";
import type { DatasetSnapshot } from "../graphdown";

export type DatasetMeta = {
  id: string;
  createdAt: number;
  updatedAt: number;
  snapshotFormatVersion: number;
  graphFormatVersion: number;
  uiStateFormatVersion: number;
  label?: string;
  source?: string;
  importReport?: ImportReport;
};

export type PersistedDatasetSnapshot = {
  files: Array<{ path: string; contents: Uint8Array }>;
};

export type PersistedGraph = {
  types: GraphTypeNode[];
  records: GraphRecordNode[];
  outgoing: Array<[string, string[]]>;
  incoming: Array<[string, string[]]>;
};

export type PersistedUiState = Record<string, unknown>;

export type LoadedDataset = {
  meta: DatasetMeta;
  datasetSnapshot: DatasetSnapshot;
  parsedGraph?: Graph;
  uiState?: PersistedUiState;
};

export type ImportReport = {
  ignoredFileCount: number;
  ignoredFileSample: string[];
  droppedBlobCount: number;
  droppedBlobSample: string[];
};
