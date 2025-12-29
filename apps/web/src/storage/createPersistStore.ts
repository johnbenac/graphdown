import { IndexedDbStore } from "./IndexedDbStore";
import { MemoryStore } from "./MemoryStore";
import type { PersistStore } from "./PersistStore";

export interface CreatePersistStoreOptions {
  forceMemory?: boolean;
  dbName?: string;
}

export async function createPersistStore(
  options: CreatePersistStoreOptions = {}
): Promise<PersistStore> {
  if (options.forceMemory) {
    return new MemoryStore();
  }

  if (typeof indexedDB === "undefined") {
    return new MemoryStore();
  }

  const store = new IndexedDbStore({ dbName: options.dbName });
  try {
    await store.keys?.();
    return store;
  } catch (err) {
    console.warn("IndexedDB unavailable, falling back to memory store.", err);
    return new MemoryStore();
  }
}
