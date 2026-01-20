import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPersistStore, IndexedDbStore } from "@graphdown/storage-idb";

describe("createPersistStore", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("throws when IndexedDB is unavailable", () => {
    vi.stubGlobal("indexedDB", undefined);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => createPersistStore({ logger: console })).toThrow(/requires IndexedDB/i);
    expect(errorSpy).toHaveBeenCalled();
  });

  it("returns an IndexedDbStore when IndexedDB is available", async () => {
    const store = createPersistStore({
      dbName: `graphdown-test-${Math.random().toString(16).slice(2)}`
    });

    expect(store).toBeInstanceOf(IndexedDbStore);
    await store.set("alpha", { value: 1 });
    await expect(store.get("alpha")).resolves.toEqual({ value: 1 });
    if (store instanceof IndexedDbStore) {
      await store.destroy();
    }
  });
});
