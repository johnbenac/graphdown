import { describe, expect, it } from "vitest";
import * as core from "..";

describe("core public surface", () => {
  it("does not export persistence helpers", () => {
    expect((core as Record<string, unknown>).createPersistence).toBeUndefined();
    expect((core as Record<string, unknown>).createIndexedDbPersistStore).toBeUndefined();
    expect((core as Record<string, unknown>).IndexedDbStore).toBeUndefined();
    expect((core as Record<string, unknown>).MemoryPersistStore).toBeUndefined();
  });
});
