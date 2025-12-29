import type { PersistStore } from "./PersistStore";

interface IndexedDbStoreOptions {
  dbName: string;
  storeName?: string;
  version?: number;
}

export default class IndexedDbStore implements PersistStore {
  private dbPromise?: Promise<IDBDatabase>;
  private dbName: string;
  private storeName: string;
  private version: number;

  constructor({ dbName, storeName = "kv", version = 1 }: IndexedDbStoreOptions) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.version = version;
  }

  private openDb(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.version);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName);
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
        request.onblocked = () => reject(new Error("IndexedDB open blocked"));
      });
    }
    return this.dbPromise;
  }

  private async withStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, mode);
      const store = transaction.objectStore(this.storeName);
      const request = action(store);
      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
      transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
    });
  }

  async get<T>(key: string): Promise<T | undefined> {
    const result = await this.withStore<T | undefined>("readonly", (store) => store.get(key));
    return result === undefined ? undefined : result;
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.withStore("readwrite", (store) => store.put(value, key));
  }

  async del(key: string): Promise<void> {
    await this.withStore("readwrite", (store) => store.delete(key));
  }

  async clear(): Promise<void> {
    await this.withStore("readwrite", (store) => store.clear());
  }

  async keys(prefix?: string): Promise<string[]> {
    const allKeys = await this.withStore<IDBValidKey[]>("readonly", (store) => store.getAllKeys());
    const keys = allKeys.map((key) => String(key));
    if (!prefix) {
      return keys;
    }
    return keys.filter((key) => key.startsWith(prefix));
  }
}

export function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}
