import { describe, expect, it } from "vitest";
import * as core from "..";

describe("core export surface", () => {
  it("does not expose persistence helpers", () => {
    expect((core as Record<string, unknown>).createPersistence).toBeUndefined();
    expect((core as Record<string, unknown>).createIndexedDbPersistStore).toBeUndefined();
    expect((core as Record<string, unknown>).MemoryPersistStore).toBeUndefined();
    expect((core as Record<string, unknown>).serializeDatasetSnapshotV1).toBeUndefined();
  });
});
