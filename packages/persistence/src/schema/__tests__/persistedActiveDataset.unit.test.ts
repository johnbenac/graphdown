import { describe, expect, it } from "vitest";
import { serializeDatasetSnapshotV1 } from "../../codec/snapshotCodec";
import {
  decodePersistedActiveDatasetV1,
  encodePersistedActiveDatasetV1,
  PERSISTED_ACTIVE_DATASET_VERSION
} from "../persistedActiveDataset";
import type { DatasetSnapshot } from "@graphdown/core";

const encoder = new TextEncoder();

describe("persisted active dataset schema", () => {
  it("encodes and decodes a persisted dataset", () => {
    const snapshot: DatasetSnapshot = {
      files: new Map([[
        "types/note.md",
        encoder.encode("---\ntypeId: note\nfields: {}\n---")
      ]])
    };
    const encoded = encodePersistedActiveDatasetV1({
      snapshot: serializeDatasetSnapshotV1(snapshot),
      meta: {
        id: "active",
        createdAt: 1,
        updatedAt: new Date(1).toISOString(),
        label: "Demo",
        source: "import"
      }
    });

    const decoded = decodePersistedActiveDatasetV1(encoded);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.value).toEqual(encoded);
  });

  it("rejects invalid payloads", () => {
    const missingVersion = decodePersistedActiveDatasetV1({
      snapshot: { files: [] },
      meta: { id: "active", createdAt: 1, updatedAt: "2024-01-01T00:00:00Z" }
    });
    expect(missingVersion.ok).toBe(false);

    const wrongVersion = decodePersistedActiveDatasetV1({
      version: 2,
      snapshot: { files: [] },
      meta: { id: "active", createdAt: 1, updatedAt: "2024-01-01T00:00:00Z" }
    });
    expect(wrongVersion.ok).toBe(false);

    const missingSnapshot = decodePersistedActiveDatasetV1({
      version: PERSISTED_ACTIVE_DATASET_VERSION,
      meta: { id: "active", createdAt: 1, updatedAt: "2024-01-01T00:00:00Z" }
    });
    expect(missingSnapshot.ok).toBe(false);

    const malformedSnapshot = decodePersistedActiveDatasetV1({
      version: PERSISTED_ACTIVE_DATASET_VERSION,
      snapshot: { files: ["nope"] },
      meta: { id: "active", createdAt: 1, updatedAt: "2024-01-01T00:00:00Z" }
    });
    expect(malformedSnapshot.ok).toBe(false);
  });
});
