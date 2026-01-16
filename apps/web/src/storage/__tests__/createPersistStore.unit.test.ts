import { describe, expect, it, vi } from "vitest";
import { createPersistStore } from "../createPersistStore";
import { IndexedDbStore } from "../IndexedDbStore";

describe("createPersistStore", () => {
  it("throws when IndexedDB is unavailable", () => {
    vi.stubGlobal("indexedDB", undefined);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      expect(() => createPersistStore({ logger: console })).toThrow(/requires IndexedDB/i);
      expect(errorSpy).toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("returns an IndexedDbStore when IndexedDB is available", async () => {
    const store = createPersistStore({
      dbName: `graphdown-test-${Math.random().toString(16).slice(2)}`
    });

    expect(store).toBeInstanceOf(IndexedDbStore);
    await store.set("alpha", { value: 1 });
    await expect(store.get<{ value: number }>("alpha")).resolves.toEqual({ value: 1 });
  });
});
