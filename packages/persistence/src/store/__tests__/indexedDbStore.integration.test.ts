import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { IndexedDbPersistStore } from "../indexedDbStore";

const dbNames: string[] = [];

function makeDbName() {
  const name = `graphdown-test-${Math.random().toString(16).slice(2)}`;
  dbNames.push(name);
  return name;
}

async function deleteDatabase(name: string): Promise<void> {
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(name);
    const timeoutId = setTimeout(resolve, 50);
    const finish = () => {
      clearTimeout(timeoutId);
      resolve();
    };
    request.onsuccess = finish;
    request.onerror = finish;
    request.onblocked = finish;
  });
}

afterEach(async () => {
  await Promise.all(dbNames.splice(0).map((name) => deleteDatabase(name)));
});

describe("IndexedDbPersistStore", () => {
  it("stores and retrieves values", async () => {
    const dbName = makeDbName();
    const store = new IndexedDbPersistStore({ dbName });

    await store.set("alpha", { value: 1 });
    await expect(store.get("alpha")).resolves.toEqual({ value: 1 });
  });

  it("deletes values", async () => {
    const dbName = makeDbName();
    const store = new IndexedDbPersistStore({ dbName });

    await store.set("beta", { value: 2 });
    await store.delete("beta");
    await expect(store.get("beta")).resolves.toBeUndefined();
  });

  it("returns undefined for missing keys", async () => {
    const dbName = makeDbName();
    const store = new IndexedDbPersistStore({ dbName });

    await expect(store.get("missing")).resolves.toBeUndefined();
  });
});
