export { createPersistence } from "./createPersistence";
export type { Persistence } from "./createPersistence";

export type {
  DatasetMeta,
  ImportReport,
  LoadedDataset,
  PersistedDatasetSnapshot,
  PersistedUiState
} from "./types";

export type { PersistStore } from "./store/PersistStore";
export { MemoryPersistStore } from "./store/memoryStore";
export {
  createIndexedDbPersistStore,
  IndexedDbStore,
  listTrackedDbNames,
  clearTrackedDbNames,
  deleteTrackedDbNames
} from "./store/indexedDbStore";

export type { SerializedDatasetSnapshotV1 } from "./codec/snapshotCodec";
export {
  serializeDatasetSnapshotV1,
  deserializeDatasetSnapshotV1
} from "./codec/snapshotCodec";

export {
  PERSISTED_ACTIVE_DATASET_VERSION,
  encodePersistedActiveDatasetV1,
  decodePersistedActiveDatasetV1
} from "./schema/persistedActiveDataset";
export type { PersistedActiveDatasetV1 } from "./schema/persistedActiveDataset";
