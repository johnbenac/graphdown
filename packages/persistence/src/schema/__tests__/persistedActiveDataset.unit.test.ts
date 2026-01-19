import { describe, expect, it } from "vitest";
import type { DatasetSnapshot } from "@graphdown/core";
import {
  decodePersistedActiveDatasetV1,
  encodePersistedActiveDatasetV1,
  PERSISTED_ACTIVE_DATASET_VERSION
} from "../persistedActiveDataset";

const encoder = new TextEncoder();

describe("persisted active dataset schema", () => {
  it("encodes and decodes the persisted dataset", () => {
    const snapshot: DatasetSnapshot = {
      files: new Map([["types/note.md", encoder.encode("note")]])
    };
    const meta = { id: "active", createdAt: 1, updatedAt: 2 };

    const encoded = encodePersistedActiveDatasetV1({ meta, snapshot });
    const decoded = decodePersistedActiveDatasetV1(encoded);

    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.value.meta).toEqual(meta);
    expect(decoded.value.snapshot).toEqual(encoded.snapshot);
  });

  it("rejects invalid persisted payloads", () => {
    expect(decodePersistedActiveDatasetV1({ snapshot: {} }).ok).toBe(false);
    expect(decodePersistedActiveDatasetV1({ version: 2 }).ok).toBe(false);
    expect(
      decodePersistedActiveDatasetV1({ version: PERSISTED_ACTIVE_DATASET_VERSION, meta: {} }).ok
    ).toBe(false);
    expect(
      decodePersistedActiveDatasetV1({
        version: PERSISTED_ACTIVE_DATASET_VERSION,
        meta: { id: "active", createdAt: 1, updatedAt: 1 },
        snapshot: { files: ["bad"] }
      }).ok
    ).toBe(false);
  });
});
