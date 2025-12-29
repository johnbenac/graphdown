import type { PersistStore } from "./PersistStore";

type IndexedDbStoreOptions = {
  dbName: string;
  storeName: string;
  version: number;
};

const DEFAULT_OPTIONS: IndexedDbStoreOptions = {
  dbName: "graphdown",
  storeName: "kv",
  version: 1,
};

export class IndexedDbStore implements PersistStore {
  private dbPromise: Promise<IDBDatabase>;
  private options: IndexedDbStoreOptions;

  constructor(options: Partial<IndexedDbStoreOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.dbPromise = this.openDb();
  }

  async get<T>(key: string): Promise<T | undefined> {
    return this.runTransaction("readonly", (store) => store.get(key));
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.runTransaction("readwrite", (store) => store.put(value, key));
  }

  async del(key: string): Promise<void> {
    await this.runTransaction("readwrite", (store) => store.delete(key));
  }

  async clear(): Promise<void> {
    await this.runTransaction("readwrite", (store) => store.clear());
  }

  async keys(prefix = ""): Promise<string[]> {
    const keys = await this.runTransaction("readonly", (store) => store.getAllKeys());
    const stringKeys = keys.map(String);
    return prefix ? stringKeys.filter((key) => key.startsWith(prefix)) : stringKeys;
  }

  private openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.options.dbName, this.options.version);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.options.storeName)) {
          db.createObjectStore(this.options.storeName);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
    });
  }

  private async runTransaction<T>(
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.options.storeName, mode);
      const store = tx.objectStore(this.options.storeName);
      const request = action(store);

      request.onsuccess = () => {
        resolve(request.result as T);
      };
      request.onerror = () => {
        reject(request.error ?? new Error("IndexedDB request failed"));
      };
      tx.onabort = () => {
        reject(tx.error ?? new Error("IndexedDB transaction aborted"));
      };
    });
  }
}
