import type { PersistStore } from "./PersistStore";

export class MemoryStore implements PersistStore {
  private store = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | undefined> {
    return this.store.get(key) as T | undefined;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, value);
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async keys(prefix?: string): Promise<string[]> {
    const allKeys = [...this.store.keys()];
    if (!prefix) {
      return allKeys;
    }
    return allKeys.filter((key) => key.startsWith(prefix));
  }
}
