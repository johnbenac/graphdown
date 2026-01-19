import type { PersistStore } from "./PersistStore";

export class MemoryPersistStore implements PersistStore {
  private readonly values = new Map<string, unknown>();

  async get(key: string): Promise<unknown | undefined> {
    return this.values.get(key);
  }

  async set(key: string, value: unknown): Promise<void> {
    this.values.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }

  async clear(): Promise<void> {
    this.values.clear();
  }
}
