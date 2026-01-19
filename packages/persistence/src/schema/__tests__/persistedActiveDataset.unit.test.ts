import { describe, expect, it } from "vitest";
import { serializeDatasetSnapshotV1 } from "../../codec/snapshotCodec";
import {
  decodePersistedActiveDatasetV1,
  encodePersistedActiveDatasetV1
} from "../persistedActiveDataset";

const encoder = new TextEncoder();

function makeSnapshot() {
  return {
    files: new Map([
      ["types/note.md", encoder.encode("---\ntypeId: note\nfields: {}\n---")]
    ])
  };
}

describe("persisted active dataset schema", () => {
  it("encodes and decodes the same value", () => {
    const meta = {
      id: "active",
      createdAt: 1,
      updatedAt: 2
    };
    const snapshot = serializeDatasetSnapshotV1(makeSnapshot());
    const encoded = encodePersistedActiveDatasetV1({ snapshot, meta, uiState: { tab: "types" } });
    const decoded = decodePersistedActiveDatasetV1(encoded);

    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.value).toEqual(encoded);
    }
  });

  it("rejects missing or mismatched versions", () => {
    const meta = { id: "active", createdAt: 1, updatedAt: 2 };
    const snapshot = serializeDatasetSnapshotV1(makeSnapshot());

    expect(decodePersistedActiveDatasetV1({ snapshot, meta }).ok).toBe(false);
    expect(decodePersistedActiveDatasetV1({ version: 2, snapshot, meta }).ok).toBe(false);
  });

  it("rejects missing or malformed snapshots", () => {
    const meta = { id: "active", createdAt: 1, updatedAt: 2 };

    expect(decodePersistedActiveDatasetV1({ version: 1, meta }).ok).toBe(false);
    expect(
      decodePersistedActiveDatasetV1({
        version: 1,
        meta,
        snapshot: { files: "bad" }
      }).ok
    ).toBe(false);
  });
});
