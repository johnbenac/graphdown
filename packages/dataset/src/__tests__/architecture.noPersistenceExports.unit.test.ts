import { describe, expect, it } from "vitest";
import * as dataset from "..";

describe("dataset exports", () => {
  it("does not expose persistence helpers", () => {
    const surface = dataset as Record<string, unknown>;
    expect(surface.createPersistence).toBeUndefined();
    expect(surface.createIndexedDbPersistStore).toBeUndefined();
    expect(surface.createPersistStore).toBeUndefined();
    expect(surface.IndexedDbStore).toBeUndefined();
    expect(surface.MemoryPersistStore).toBeUndefined();
    expect(surface.KEY).toBeUndefined();
  });
});
