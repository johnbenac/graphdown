import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { IndexedDbStore } from "../indexedDbStore";

let dbName = "";

function makeDbName(prefix: string) {
  return `${prefix}-${Math.random().toString(16).slice(2)}`;
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
  if (!dbName) {
    return;
  }
  await deleteDatabase(dbName);
  dbName = "";
});

describe("IndexedDbStore", () => {
  it("round-trips values", async () => {
    dbName = makeDbName("indexeddb-store");
    const store = new IndexedDbStore({ dbName });

    await store.set("alpha", { value: 1 });
    await expect(store.get("alpha")).resolves.toEqual({ value: 1 });
  });

  it("deletes values", async () => {
    dbName = makeDbName("indexeddb-store");
    const store = new IndexedDbStore({ dbName });

    await store.set("alpha", { value: 1 });
    await store.delete("alpha");
    await expect(store.get("alpha")).resolves.toBeUndefined();
  });

  it("returns undefined for missing keys", async () => {
    dbName = makeDbName("indexeddb-store");
    const store = new IndexedDbStore({ dbName });

    await expect(store.get("missing")).resolves.toBeUndefined();
  });
});
