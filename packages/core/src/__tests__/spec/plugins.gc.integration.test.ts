import assert from "node:assert/strict";
import { describe, expect, it } from "vitest";

import {
  blockPathForCid,
  buildDatasetZipBytes,
  canonicalizeDatasetSnapshot,
  cidFromRawBytes,
  loadDatasetSnapshotFromZipBytes,
  validateDatasetSnapshot
} from "../..";
import type { DatasetSnapshot } from "../..";
import { loadFixtureSnapshot } from "../fixtureLoader";

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

describe("plugins GC", () => {
  it("GC-001: plugin-declared blocks are included in the reachable set", () => {
    const snapshot = loadFixtureSnapshot("plugin-valid-dataset");
    const result = validateDatasetSnapshot(snapshot);
    expect(result.ok).toBe(true);

    const canonical = canonicalizeDatasetSnapshot(snapshot);
    const expectedPath =
      "blocks/sha2-256/e3/bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku";
    expect(canonical.files.has(expectedPath)).toBe(true);
  });

  it("GC-002: export excludes blocks not referenced by records or plugin blocks", () => {
    const snapshot = loadFixtureSnapshot("plugin-valid-dataset");
    const garbageBytes = encoder.encode("garbage");
    const garbageCid = cidFromRawBytes(garbageBytes);
    const garbagePath = blockPathForCid(garbageCid);
    const mutated: DatasetSnapshot = { files: new Map(snapshot.files) };
    mutated.files.set(garbagePath, garbageBytes);

    const result = validateDatasetSnapshot(mutated);
    expect(result.ok).toBe(true);

    const { roundTripped } = exportAndLoad(mutated);
    const paths = [...roundTripped.files.keys()];
    const pluginBlockPath =
      "blocks/sha2-256/e3/bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku";
    assert.ok(paths.includes(pluginBlockPath));
    assert.ok(!paths.includes(garbagePath));
  });

  it("GC-003: garbage blocks do not make dataset invalid (with plugins present)", () => {
    const snapshot = loadFixtureSnapshot("plugin-valid-dataset");
    const garbageBytes = encoder.encode("garbage");
    const garbageCid = cidFromRawBytes(garbageBytes);
    const garbagePath = blockPathForCid(garbageCid);
    const mutated: DatasetSnapshot = { files: new Map(snapshot.files) };
    mutated.files.set(garbagePath, garbageBytes);

    const result = validateDatasetSnapshot(mutated);
    expect(result.ok).toBe(true);
  });
});
