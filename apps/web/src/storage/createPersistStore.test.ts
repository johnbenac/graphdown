import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IndexedDbStore } from "./IndexedDbStore";
import { createPersistStore } from "./createPersistStore";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("createPersistStore", () => {
  it("NFR-PERSIST-001: throws when IndexedDB is unavailable", () => {
    vi.stubGlobal("indexedDB", undefined);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => createPersistStore()).toThrow(/requires IndexedDB/i);
    expect(errorSpy).toHaveBeenCalled();
  });

  it("NFR-PERSIST-001: returns IndexedDbStore when IndexedDB exists", async () => {
    const store = createPersistStore({ dbName: `graphdown-test-${Date.now()}` });
    expect(store).toBeInstanceOf(IndexedDbStore);
    await store.set("alpha", { value: 1 });
    await expect(store.get<{ value: number }>("alpha")).resolves.toEqual({ value: 1 });
  });
});
