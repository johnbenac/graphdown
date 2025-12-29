import { IndexedDbStore } from "./IndexedDbStore";
import { MemoryStore } from "./MemoryStore";
import type { PersistStore } from "./PersistStore";

type Logger = {
  warn: (message: string, error?: unknown) => void;
};

type CreatePersistStoreOptions = {
  forceMemory?: boolean;
  logger?: Logger;
  dbName?: string;
  storeName?: string;
};

class FallbackStore implements PersistStore {
  private activeStore: PersistStore;
  private readonly primary: PersistStore;
  private readonly fallback: PersistStore;
  private readonly logger: Logger;

  constructor(primary: PersistStore, fallback: PersistStore, logger: Logger) {
    this.primary = primary;
    this.fallback = fallback;
    this.activeStore = primary;
    this.logger = logger;
  }

  private async runWithFallback<T>(operation: (store: PersistStore) => Promise<T>): Promise<T> {
    try {
      return await operation(this.activeStore);
    } catch (error) {
      if (this.activeStore === this.fallback) {
        throw error;
      }
      this.logger.warn("IndexedDB failed; switching to in-memory persistence.", error);
      this.activeStore = this.fallback;
      return operation(this.activeStore);
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    return this.runWithFallback((store) => store.get<T>(key));
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.runWithFallback((store) => store.set<T>(key, value));
  }

  async del(key: string): Promise<void> {
    await this.runWithFallback((store) => store.del(key));
  }

  async clear(): Promise<void> {
    await this.runWithFallback((store) => store.clear());
  }

  async keys(prefix?: string): Promise<string[]> {
    return this.runWithFallback((store) => store.keys?.(prefix) ?? Promise.resolve([]));
  }
}

export function createPersistStore(options?: CreatePersistStoreOptions): PersistStore {
  const logger = options?.logger ?? console;
  if (options?.forceMemory || typeof indexedDB === "undefined") {
    return new MemoryStore();
  }
  const indexedDb = new IndexedDbStore({
    dbName: options?.dbName,
    storeName: options?.storeName
  });
  return new FallbackStore(indexedDb, new MemoryStore(), logger);
}
