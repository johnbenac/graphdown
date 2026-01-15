import type { DatasetSnapshot } from "@graphdown/core";

export type DatasetMeta = {
  id: string;
  createdAt: number;
  updatedAt: number;
  label?: string;
  source?: string;
  importReport?: ImportReport;
};

export type PersistedDatasetSnapshot = {
  files: Array<{ path: string; contents: Uint8Array }>;
};

export type PersistedUiState = Record<string, unknown>;

export type LoadedDataset = {
  meta: DatasetMeta;
  datasetSnapshot: DatasetSnapshot;
  uiState?: PersistedUiState;
};

export type ImportReport = {
  ignoredFileCount: number;
  ignoredFileSample: string[];
  droppedBlockCount: number;
  droppedBlockSample: string[];
};
