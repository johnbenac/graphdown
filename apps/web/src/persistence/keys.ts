export const KEY = {
  activeDatasetId: "meta:activeDatasetId",
  datasetIndex: "meta:datasetIndex",
  repoSnapshot: (id: string) => `dataset:${id}:repoSnapshot`,
  parsedGraph: (id: string) => `dataset:${id}:parsedGraph`,
  uiState: (id: string) => `dataset:${id}:uiState`,
  datasetMeta: (id: string) => `dataset:${id}:meta`
} as const;
