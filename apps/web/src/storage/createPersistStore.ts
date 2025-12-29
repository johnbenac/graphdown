import IndexedDbStore, { isIndexedDbAvailable } from "./IndexedDbStore";
import MemoryStore from "./MemoryStore";
import type { PersistStore } from "./PersistStore";

interface PersistStoreOptions {
  forceMemory?: boolean;
  dbName?: string;
}

function shouldForceMemory(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const params = new URLSearchParams(window.location.search);
  return params.get("storage") === "memory";
}

export async function createPersistStore(options: PersistStoreOptions = {}): Promise<PersistStore> {
  if (options.forceMemory || shouldForceMemory() || !isIndexedDbAvailable()) {
    return new MemoryStore();
  }

  try {
    const store = new IndexedDbStore({ dbName: options.dbName ?? "graphdown" });
    await store.keys();
    return store;
  } catch (error) {
    console.warn("IndexedDB unavailable, falling back to in-memory store.", error);
    return new MemoryStore();
  }
}
