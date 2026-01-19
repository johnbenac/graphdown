import type { PersistStore } from "./PersistStore";

export class MemoryPersistStore implements PersistStore {
  private readonly data = new Map<string, unknown>();

  async get(key: string): Promise<unknown | undefined> {
    return this.data.get(key);
  }

  async set(key: string, value: unknown): Promise<void> {
    this.data.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key);
  }

  async clear(): Promise<void> {
    this.data.clear();
  }
}
