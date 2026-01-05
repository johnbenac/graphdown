export const KEY = {
  activeDatasetId: "meta:activeDatasetId",
  datasetIndex: "meta:datasetIndex",
  datasetSnapshot: (id: string) => `dataset:${id}:datasetSnapshot`,
  parsedGraph: (id: string) => `dataset:${id}:parsedGraph`,
  uiState: (id: string) => `dataset:${id}:uiState`,
  datasetMeta: (id: string) => `dataset:${id}:meta`
} as const;
