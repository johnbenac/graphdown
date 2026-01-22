import type { DatasetSnapshot } from "@graphdown/dataset";
import { serializeDatasetSnapshotV1, deserializeDatasetSnapshotV1 } from "./codec/snapshotCodec";
import { KEY } from "./keys";
import {
  decodePersistedActiveDatasetV1,
  encodePersistedActiveDatasetV1,
  PERSISTED_ACTIVE_DATASET_VERSION
} from "./schema/persistedActiveDataset";
import type { PersistStore } from "./store/PersistStore";
import type { DatasetMeta, LoadedDataset, PersistedDatasetSnapshot, PersistedUiState } from "./types";

export type Persistence = {
  loadActive(): Promise<LoadedDataset | null>;
  saveActive(input: {
    meta: DatasetMeta;
    snapshot: DatasetSnapshot;
    uiState?: PersistedUiState;
  }): Promise<void>;
  clearActive(): Promise<void>;
};

type CreatePersistenceOptions = {
  store: PersistStore;
};

type SerializedResult<T> = { ok: true; value: T } | { ok: false; error: string };

function serializeForStorage(snapshot: DatasetSnapshot): PersistedDatasetSnapshot {
  const serialized = serializeDatasetSnapshotV1(snapshot);
  return {
    files: serialized.files.map(([path, contents]) => ({ path, contents }))
  };
}

function parseStoredSnapshot(input: unknown): SerializedResult<{
  files: Array<[string, Uint8Array]>;
}> {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Stored snapshot must be an object." };
  }
  const record = input as PersistedDatasetSnapshot;
  if (!Array.isArray(record.files)) {
    return { ok: false, error: "Stored snapshot files must be an array." };
  }
  const files: Array<[string, Uint8Array]> = [];
  for (const entry of record.files) {
    if (!entry || typeof entry !== "object") {
      return { ok: false, error: "Stored snapshot entries must be objects." };
    }
    const file = entry as { path?: unknown; contents?: unknown };
    let contents: Uint8Array | null = null;
    if (file.contents instanceof Uint8Array) {
      contents = file.contents;
    } else if (file.contents instanceof ArrayBuffer) {
      contents = new Uint8Array(file.contents);
    } else if (ArrayBuffer.isView(file.contents)) {
      contents = new Uint8Array(
        file.contents.buffer,
        file.contents.byteOffset,
        file.contents.byteLength
      );
    }
    if (typeof file.path !== "string" || !contents) {
      return { ok: false, error: "Stored snapshot entries are invalid." };
    }
    files.push([file.path, contents]);
  }
  return { ok: true, value: { files } };
}

export function createPersistence(options: CreatePersistenceOptions): Persistence {
  const { store } = options;

  const clearActive = async () => {
    await store.delete(KEY.activeMeta);
    await store.delete(KEY.activeSnapshot);
    await store.delete(KEY.activeUiState);
  };

  return {
    async loadActive() {
      const meta = (await store.get(KEY.activeMeta)) as DatasetMeta | undefined;
      const snapshotPayload = await store.get(KEY.activeSnapshot);
      const uiState = (await store.get(KEY.activeUiState)) as PersistedUiState | undefined;
      if (!meta || !snapshotPayload) {
        if (meta || snapshotPayload) {
          await clearActive();
        }
        return null;
      }
      const storedSnapshot = parseStoredSnapshot(snapshotPayload);
      if (!storedSnapshot.ok) {
        await clearActive();
        return null;
      }
      const candidate = decodePersistedActiveDatasetV1({
        version: PERSISTED_ACTIVE_DATASET_VERSION,
        snapshot: storedSnapshot.value,
        meta,
        uiState
      });
      if (!candidate.ok) {
        await clearActive();
        return null;
      }
      const snapshotResult = deserializeDatasetSnapshotV1(candidate.value.snapshot);
      if (!snapshotResult.ok) {
        await clearActive();
        return null;
      }
      return {
        meta: candidate.value.meta,
        snapshot: snapshotResult.snapshot,
        ...(candidate.value.uiState ? { uiState: candidate.value.uiState } : {})
      };
    },
    async saveActive({ meta, snapshot, uiState }) {
      const serializedSnapshot = serializeDatasetSnapshotV1(snapshot);
      const encoded = encodePersistedActiveDatasetV1({
        snapshot: serializedSnapshot,
        meta,
        ...(uiState ? { uiState } : {})
      });
      await store.set(KEY.activeSnapshot, {
        files: encoded.snapshot.files.map(([path, contents]) => ({ path, contents }))
      });
      await store.set(KEY.activeMeta, encoded.meta);
      if (encoded.uiState) {
        await store.set(KEY.activeUiState, encoded.uiState);
      }
    },
    clearActive
  };
}
