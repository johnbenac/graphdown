import assert from "node:assert/strict";
import { describe, expect, it } from "vitest";

import {
  blockPathForCid,
  buildDatasetZipBytes,
  canonicalizeDatasetSnapshot,
  cidFromRawBytes,
  loadDatasetSnapshotFromZipBytes,
  validateDatasetSnapshot
} from "..";
import type { DatasetSnapshot } from "..";
import { loadFixtureSnapshot } from "./fixtureLoader";

const encoder = new TextEncoder();

function exportAndLoad(rawSnapshot: DatasetSnapshot) {
  const canonical = canonicalizeDatasetSnapshot(rawSnapshot);
  const normalized: DatasetSnapshot = {
    files: new Map(
      [...canonical.files.entries()].map(([path, bytes]) => [
        path,
        bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
      ])
    )
  };
  const zipBytes = buildDatasetZipBytes(normalized);
  return { canonical: normalized, roundTripped: loadDatasetSnapshotFromZipBytes(zipBytes), zipBytes };
}

describe("plugin GC semantics", () => {
  it("GC-001: plugin-declared blocks are included in the reachable set", () => {
    const snapshot = loadFixtureSnapshot("plugin-valid-dataset");
    const result = validateDatasetSnapshot(snapshot);
    expect(result.ok).toBe(true);

    const canonical = canonicalizeDatasetSnapshot(snapshot);
    const pluginBlockPath =
      "blocks/sha2-256/e3/bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku";
    expect(canonical.files.has(pluginBlockPath)).toBe(true);
  });

  it("GC-002: export excludes blocks not referenced by records or plugin blocks", () => {
    const snapshot = loadFixtureSnapshot("plugin-valid-dataset");
    const garbageBytes = encoder.encode("garbage");
    const garbageCid = cidFromRawBytes(garbageBytes);
    const garbagePath = blockPathForCid(garbageCid);

    const extendedSnapshot: DatasetSnapshot = {
      files: new Map(snapshot.files)
    };
    extendedSnapshot.files.set(garbagePath, garbageBytes);

    const result = validateDatasetSnapshot(extendedSnapshot);
    expect(result.ok).toBe(true);

    const { roundTripped } = exportAndLoad(extendedSnapshot);
    const pluginBlockCid = "bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku";
    const pluginBlockPath = blockPathForCid(pluginBlockCid);

    assert.ok(roundTripped.files.has(pluginBlockPath));
    assert.ok(!roundTripped.files.has(garbagePath));
  });

  it("GC-003: garbage blocks do not make dataset invalid (with plugins present)", () => {
    const snapshot = loadFixtureSnapshot("plugin-valid-dataset");
    const garbageBytes = encoder.encode("garbage");
    const garbageCid = cidFromRawBytes(garbageBytes);
    const garbagePath = blockPathForCid(garbageCid);

    const extendedSnapshot: DatasetSnapshot = {
      files: new Map(snapshot.files)
    };
    extendedSnapshot.files.set(garbagePath, garbageBytes);

    const result = validateDatasetSnapshot(extendedSnapshot);
    expect(result.ok).toBe(true);
  });
});
