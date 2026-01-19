import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { createIndexedDbPersistStore } from "../indexedDbStore";

const dbNames: string[] = [];

function makeDbName(prefix: string) {
  const name = `${prefix}-${Math.random().toString(16).slice(2)}`;
  dbNames.push(name);
  return name;
}

async function deleteDatabase(name: string): Promise<void> {
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(name);
    const finish = () => resolve();
    request.onsuccess = finish;
    request.onerror = finish;
    request.onblocked = finish;
  });
}

afterEach(async () => {
  await Promise.all(dbNames.splice(0).map((name) => deleteDatabase(name)));
});

describe("IndexedDbPersistStore", () => {
  it("round-trips set/get", async () => {
    const dbName = makeDbName("persist-store");
    const store = createIndexedDbPersistStore({ dbName });

    await store.set("alpha", { value: 1 });
    await expect(store.get("alpha")).resolves.toEqual({ value: 1 });
  });

  it("deletes records", async () => {
    const dbName = makeDbName("persist-store");
    const store = createIndexedDbPersistStore({ dbName });

    await store.set("alpha", { value: 1 });
    await store.delete("alpha");

    await expect(store.get("alpha")).resolves.toBeUndefined();
  });

  it("returns undefined for missing keys", async () => {
    const dbName = makeDbName("persist-store");
    const store = createIndexedDbPersistStore({ dbName });

    await expect(store.get("missing")).resolves.toBeUndefined();
  });
});
