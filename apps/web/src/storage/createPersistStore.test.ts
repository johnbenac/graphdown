import "fake-indexeddb/auto";
import { describe, expect, it, afterEach, vi } from "vitest";
import { createPersistStore } from "./createPersistStore";

const originalConsoleError = console.error;

describe("createPersistStore", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    console.error = originalConsoleError;
  });

  it("throws loudly when IndexedDB is unavailable", () => {
    vi.stubGlobal("indexedDB", undefined);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => createPersistStore()).toThrow(/requires IndexedDB/i);
    expect(errorSpy).toHaveBeenCalled();
  });

  it("returns an IndexedDbStore when IndexedDB exists", async () => {
    const store = createPersistStore();
    await store.set("alpha", { value: 1 });
    expect(await store.get("alpha")).toEqual({ value: 1 });
  });
});
