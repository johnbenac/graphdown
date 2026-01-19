import { describe, expect, it } from "vitest";
import {
  decodePersistedActiveDatasetV1,
  encodePersistedActiveDatasetV1,
  PERSISTED_ACTIVE_DATASET_VERSION
} from "../persistedActiveDataset";

type SerializedDatasetSnapshotV1 = {
  files: Array<[string, Uint8Array]>;
};

describe("persisted active dataset schema", () => {
  it("encodes and decodes the same value", () => {
    const snapshot: SerializedDatasetSnapshotV1 = {
      files: [["types/note.md", Uint8Array.from([1, 2, 3])]]
    };
    const meta = { id: "dataset-1", createdAt: 1, updatedAt: 2 };

    const encoded = encodePersistedActiveDatasetV1({ snapshot, meta });
    const decoded = decodePersistedActiveDatasetV1(encoded);

    expect(decoded.ok).toBe(true);
    if (!decoded.ok) {
      return;
    }
    expect(decoded.value).toEqual(encoded);
  });

  it("rejects missing or invalid fields", () => {
    expect(decodePersistedActiveDatasetV1({ snapshot: { files: [] }, meta: {} })).toEqual({
      ok: false,
      error: "Persisted dataset version is invalid."
    });
    expect(
      decodePersistedActiveDatasetV1({
        version: PERSISTED_ACTIVE_DATASET_VERSION + 1,
        snapshot: { files: [] },
        meta: { id: "dataset-1", createdAt: 1, updatedAt: 1 }
      })
    ).toEqual({
      ok: false,
      error: "Persisted dataset version is invalid."
    });
    expect(
      decodePersistedActiveDatasetV1({
        version: PERSISTED_ACTIVE_DATASET_VERSION,
        meta: { id: "dataset-1", createdAt: 1, updatedAt: 1 }
      })
    ).toEqual({
      ok: false,
      error: "Persisted dataset snapshot is missing."
    });
    expect(
      decodePersistedActiveDatasetV1({
        version: PERSISTED_ACTIVE_DATASET_VERSION,
        snapshot: { files: [["types/note.md", "bad"]] },
        meta: { id: "dataset-1", createdAt: 1, updatedAt: 1 }
      })
    ).toEqual({
      ok: false,
      error: "Persisted dataset snapshot is invalid: Snapshot file entries must contain a string and Uint8Array."
    });
  });

  it("does not throw on invalid inputs", () => {
    expect(() => decodePersistedActiveDatasetV1(null)).not.toThrow();
  });
});
