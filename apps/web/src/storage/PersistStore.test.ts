import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { IndexedDbStore } from "./IndexedDbStore";
import { MemoryStore } from "./MemoryStore";
import type { PersistStore } from "./PersistStore";

type StoreFactory = () => PersistStore;

const runPersistStoreContract = (name: string, createStore: StoreFactory) => {
  describe(name, () => {
    let store: PersistStore;

    beforeEach(() => {
      store = createStore();
    });

    it("returns undefined for missing keys", async () => {
      await expect(store.get("missing")).resolves.toBeUndefined();
    });

    it("round trips values", async () => {
      await store.set("alpha", { value: 42 });
      await expect(store.get<{ value: number }>("alpha")).resolves.toEqual({ value: 42 });
    });

    it("overwrites values", async () => {
      await store.set("alpha", "first");
      await store.set("alpha", "second");
      await expect(store.get("alpha")).resolves.toBe("second");
    });

    it("deletes values", async () => {
      await store.set("alpha", "value");
      await store.del("alpha");
      await expect(store.get("alpha")).resolves.toBeUndefined();
    });

    it("clears all values", async () => {
      await store.set("alpha", 1);
      await store.set("beta", 2);
      await store.clear();
      await expect(store.get("alpha")).resolves.toBeUndefined();
      await expect(store.get("beta")).resolves.toBeUndefined();
    });

    it("lists keys with prefixes", async () => {
      await store.set("dataset:one", true);
      await store.set("dataset:two", true);
      await store.set("meta:active", true);
      const keys = store.keys ? await store.keys("dataset:") : [];
      expect(keys.sort()).toEqual(["dataset:one", "dataset:two"]);
    });
  });
};

runPersistStoreContract("MemoryStore", () => new MemoryStore());
runPersistStoreContract(
  "IndexedDbStore",
  () => new IndexedDbStore({ dbName: `graphdown-test-${crypto.randomUUID()}` })
);
