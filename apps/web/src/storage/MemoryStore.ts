import type { PersistStore } from "./PersistStore";

export default class MemoryStore implements PersistStore {
  private data = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | undefined> {
    return this.data.get(key) as T | undefined;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.data.set(key, value);
  }

  async del(key: string): Promise<void> {
    this.data.delete(key);
  }

  async clear(): Promise<void> {
    this.data.clear();
  }

  async keys(prefix?: string): Promise<string[]> {
    const keys = [...this.data.keys()];
    if (!prefix) {
      return keys;
    }
    return keys.filter((key) => key.startsWith(prefix));
  }
}
