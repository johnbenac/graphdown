import type { DatasetSnapshot } from "@graphdown/core";

export type ImportReport = {
  ignoredFileCount: number;
  ignoredFileSample: string[];
  droppedBlockCount: number;
  droppedBlockSample: string[];
};

export type DatasetMeta = {
  id: string;
  createdAt: number;
  updatedAt: number;
  label?: string;
  source?: string;
  importReport?: ImportReport;
};

export type LoadedDataset = {
  meta: DatasetMeta;
  snapshot: DatasetSnapshot;
};
