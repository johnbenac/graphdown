import { describe, expect, it } from "vitest";
import * as core from "..";

describe("core public API", () => {
  it("does not expose persistence helpers", () => {
    expect((core as any).createPersistence).toBeUndefined();
    expect((core as any).createPersistStore).toBeUndefined();
    expect((core as any).createIndexedDbPersistStore).toBeUndefined();
    expect((core as any).IndexedDbPersistStore).toBeUndefined();
  });
});
