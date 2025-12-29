import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { IndexedDbStore } from "./IndexedDbStore";
import { MemoryStore } from "./MemoryStore";
import type { PersistStore } from "./PersistStore";

async function runContractTests(label: string, createStore: () => PersistStore | Promise<PersistStore>) {
  describe(label, () => {
    it("round trips values", async () => {
      const store = await createStore();
      await store.set("alpha", { value: 123 });
      await store.set("beta", "ok");

      expect(await store.get<{ value: number }>("alpha")).toEqual({ value: 123 });
      expect(await store.get("beta")).toBe("ok");
    });

    it("overwrites existing values", async () => {
      const store = await createStore();
      await store.set("alpha", "first");
      await store.set("alpha", "second");

      expect(await store.get("alpha")).toBe("second");
    });

    it("returns undefined for missing keys", async () => {
      const store = await createStore();
      expect(await store.get("missing")).toBeUndefined();
    });

    it("deletes keys", async () => {
      const store = await createStore();
      await store.set("alpha", 1);
      await store.del("alpha");

      expect(await store.get("alpha")).toBeUndefined();
    });

    it("clears all keys", async () => {
      const store = await createStore();
      await store.set("alpha", 1);
      await store.set("beta", 2);
      await store.clear();

      expect(await store.get("alpha")).toBeUndefined();
      expect(await store.get("beta")).toBeUndefined();
    });

    it("lists keys with optional prefix", async () => {
      const store = await createStore();
      await store.set("dataset:one", 1);
      await store.set("dataset:two", 2);
      await store.set("meta:active", 3);

      const keys = store.keys ? await store.keys() : [];
      expect(keys.sort()).toEqual(["dataset:one", "dataset:two", "meta:active"].sort());

      const datasetKeys = store.keys ? await store.keys("dataset:") : [];
      expect(datasetKeys.sort()).toEqual(["dataset:one", "dataset:two"].sort());
    });
  });
}

runContractTests("MemoryStore", () => new MemoryStore());

runContractTests("IndexedDbStore", () => {
  const dbName = `graphdown-test-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return new IndexedDbStore({ dbName });
});
