import "fake-indexeddb/auto";
import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { IndexedDbStore } from "../IndexedDbStore";
import type { PersistStore } from "../PersistStore";

async function runStoreContract(store: PersistStore) {
  await store.set("alpha", { value: 1 });
  await store.set("beta", { value: 2 });

  const roundTrip = await store.get<{ value: number }>("alpha");
  expect(roundTrip).toEqual({ value: 1 });

  await store.set("alpha", { value: 3 });
  expect(await store.get<{ value: number }>("alpha")).toEqual({ value: 3 });

  await store.del("beta");
  expect(await store.get("beta")).toBeUndefined();

  await store.clear();
  expect(await store.get("alpha")).toBeUndefined();
}

describe("PersistStore contract", () => {
  it("IndexedDbStore follows the contract", async () => {
    const dbName = `graphdown-test-${Math.random().toString(16).slice(2)}`;
    const store = new IndexedDbStore({ dbName });
    try {
      await runStoreContract(store);
    } finally {
      await store.destroy();
    }
  });
});
