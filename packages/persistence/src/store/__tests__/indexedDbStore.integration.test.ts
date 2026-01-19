import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { IndexedDbStore } from "../indexedDbStore";

let dbName = "";

function makeDbName(prefix: string) {
  return `${prefix}-${Math.random().toString(16).slice(2)}`;
}

async function deleteDatabase(name: string): Promise<void> {
  if (!name) {
    return;
  }
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(name);
    const finish = () => resolve();
    request.onsuccess = finish;
    request.onerror = finish;
    request.onblocked = finish;
  });
}

afterEach(async () => {
  await deleteDatabase(dbName);
  dbName = "";
});

describe("IndexedDbStore", () => {
  it("round-trips stored values", async () => {
    dbName = makeDbName("indexeddb");
    const store = new IndexedDbStore({ dbName });

    await store.set("key", { value: "demo" });
    await expect(store.get("key")).resolves.toEqual({ value: "demo" });

    await store.close();
  });

  it("deletes values", async () => {
    dbName = makeDbName("indexeddb");
    const store = new IndexedDbStore({ dbName });

    await store.set("key", "value");
    await store.delete("key");
    await expect(store.get("key")).resolves.toBeUndefined();

    await store.close();
  });

  it("returns undefined for missing keys", async () => {
    dbName = makeDbName("indexeddb");
    const store = new IndexedDbStore({ dbName });

    await expect(store.get("missing")).resolves.toBeUndefined();

    await store.close();
  });
});
