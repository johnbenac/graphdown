import type { PersistStore } from "./PersistStore";
import { IndexedDbStore } from "./IndexedDbStore";
import { MemoryStore } from "./MemoryStore";

type CreatePersistStoreOptions = {
  forceMemory?: boolean;
  onError?: (error: unknown) => void;
};

class ResilientStore implements PersistStore {
  private active: PersistStore;

  constructor(
    private primary: PersistStore,
    private fallback: PersistStore,
    private onError: (error: unknown) => void,
  ) {
    this.active = primary;
  }

  async get<T>(key: string): Promise<T | undefined> {
    return this.run((store) => store.get<T>(key));
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.run((store) => store.set(key, value));
  }

  async del(key: string): Promise<void> {
    await this.run((store) => store.del(key));
  }

  async clear(): Promise<void> {
    await this.run((store) => store.clear());
  }

  async keys(prefix?: string): Promise<string[]> {
    const store = this.active;
    if (store.keys) {
      return this.run((activeStore) => activeStore.keys?.(prefix) ?? []);
    }
    return [];
  }

  private async run<T>(action: (store: PersistStore) => Promise<T>): Promise<T> {
    try {
      return await action(this.active);
    } catch (error) {
      if (this.active === this.primary) {
        this.active = this.fallback;
        this.onError(error);
        return action(this.active);
      }
      throw error;
    }
  }
}

export function createPersistStore(options: CreatePersistStoreOptions = {}): PersistStore {
  if (options.forceMemory || typeof indexedDB === "undefined") {
    return new MemoryStore();
  }

  const onError =
    options.onError ??
    ((error: unknown) => {
      console.warn("IndexedDB unavailable, falling back to memory store.", error);
    });
  return new ResilientStore(new IndexedDbStore(), new MemoryStore(), onError);
}
