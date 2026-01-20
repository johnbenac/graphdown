import { describe, expect, it } from "vitest";
import { MemoryPersistStore } from "../memoryStore";

describe("MemoryPersistStore", () => {
  it("returns undefined for missing keys", async () => {
    const store = new MemoryPersistStore();

    await expect(store.get("missing")).resolves.toBeUndefined();
  });

  it("stores and retrieves values", async () => {
    const store = new MemoryPersistStore();
    const value = { key: "value" };

    await store.set("item", value);

    await expect(store.get("item")).resolves.toEqual(value);
  });

  it("deletes values by key", async () => {
    const store = new MemoryPersistStore();

    await store.set("item", "value");
    await store.delete("item");

    await expect(store.get("item")).resolves.toBeUndefined();
  });

  it("clears all values", async () => {
    const store = new MemoryPersistStore();

    await store.set("one", 1);
    await store.set("two", 2);
    await store.clear();

    await expect(store.get("one")).resolves.toBeUndefined();
    await expect(store.get("two")).resolves.toBeUndefined();
  });
});
