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
const pluginBlockPath =
  "blocks/sha2-256/e3/bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku";

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
  return { canonical: normalized, roundTripped: loadDatasetSnapshotFromZipBytes(zipBytes) };
}

function buildSnapshotWithGarbageBlock() {
  const base = loadFixtureSnapshot("plugin-valid-dataset");
  const files = new Map(base.files);
  const garbageBytes = encoder.encode("garbage");
  const garbageCid = cidFromRawBytes(garbageBytes);
  const garbagePath = blockPathForCid(garbageCid);
  files.set(garbagePath, garbageBytes);
  return { snapshot: { files }, garbagePath };
}

describe("plugins gc", () => {
  it("GC-001: plugin-declared blocks are included in the reachable set", () => {
    const snapshot = loadFixtureSnapshot("plugin-valid-dataset");
    const validation = validateDatasetSnapshot(snapshot);
    expect(validation.ok).toBe(true);
    const canonical = canonicalizeDatasetSnapshot(snapshot);
    expect(canonical.files.has(pluginBlockPath)).toBe(true);
  });

  it("GC-002: export excludes blocks not referenced by records or plugin blocks", () => {
    const { snapshot, garbagePath } = buildSnapshotWithGarbageBlock();
    const validation = validateDatasetSnapshot(snapshot);
    expect(validation.ok).toBe(true);
    const { roundTripped } = exportAndLoad(snapshot);
    expect(roundTripped.files.has(pluginBlockPath)).toBe(true);
    expect(roundTripped.files.has(garbagePath)).toBe(false);
  });

  it("GC-003: garbage blocks do not make dataset invalid (with plugins present)", () => {
    const { snapshot } = buildSnapshotWithGarbageBlock();
    const validation = validateDatasetSnapshot(snapshot);
    expect(validation.ok).toBe(true);
  });
});
