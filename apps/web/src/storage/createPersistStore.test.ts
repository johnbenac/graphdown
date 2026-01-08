import { afterEach, describe, expect, it, vi } from "vitest";
import { indexedDB as fakeIndexedDB } from "fake-indexeddb";
import { createPersistStore } from "./createPersistStore";

describe("createPersistStore", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("NFR-PERSIST-001: throws when IndexedDB is missing", () => {
    vi.stubGlobal("indexedDB", undefined);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => createPersistStore()).toThrow(/requires IndexedDB/i);
    expect(errorSpy).toHaveBeenCalled();
  });

  it("returns an IndexedDbStore when IndexedDB exists", async () => {
    vi.stubGlobal("indexedDB", fakeIndexedDB);
    const store = createPersistStore({ dbName: `graphdown-test-${Math.random().toString(16).slice(2)}` });
    await store.set("alpha", { value: 1 });
    await expect(store.get("alpha")).resolves.toEqual({ value: 1 });
  });
});
