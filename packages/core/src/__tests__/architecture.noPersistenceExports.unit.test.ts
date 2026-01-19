import { describe, expect, it } from "vitest";
import * as core from "..";

describe("core exports", () => {
  it("does not expose persistence helpers", () => {
    const surface = core as Record<string, unknown>;
    expect(surface.createPersistence).toBeUndefined();
    expect(surface.createIndexedDbPersistStore).toBeUndefined();
    expect(surface.createPersistStore).toBeUndefined();
    expect(surface.IndexedDbStore).toBeUndefined();
    expect(surface.MemoryPersistStore).toBeUndefined();
    expect(surface.KEY).toBeUndefined();
  });
});
