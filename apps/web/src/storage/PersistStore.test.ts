import "fake-indexeddb/auto";
import IndexedDbStore from "./IndexedDbStore";
import MemoryStore from "./MemoryStore";
import type { PersistStore } from "./PersistStore";

async function runPersistStoreContract(createStore: () => Promise<PersistStore> | PersistStore) {
  const store = await createStore();

  await store.set("alpha", { value: 1 });
  expect(await store.get<{ value: number }>("alpha")).toEqual({ value: 1 });

  await store.set("alpha", { value: 2 });
  expect(await store.get<{ value: number }>("alpha")).toEqual({ value: 2 });

  await store.set("beta", "value");
  await store.del("beta");
  expect(await store.get("beta")).toBeUndefined();

  await store.set("gamma", 3);
  await store.set("delta", 4);
  await store.clear();
  expect(await store.get("gamma")).toBeUndefined();
  expect(await store.get("delta")).toBeUndefined();
}

describe("PersistStore contract", () => {
  it("supports the memory store", async () => {
    await runPersistStoreContract(() => new MemoryStore());
  });

  it("supports the indexeddb store", async () => {
    const dbName = `graphdown-test-${Math.random().toString(16).slice(2)}`;
    await runPersistStoreContract(() => new IndexedDbStore({ dbName }));
  });
});
