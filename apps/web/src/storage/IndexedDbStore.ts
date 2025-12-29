import type { PersistStore } from "./PersistStore";

type IndexedDbStoreOptions = {
  dbName?: string;
  storeName?: string;
};

type StoreRecord = {
  key: string;
  value: unknown;
};

export class IndexedDbStore implements PersistStore {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private readonly dbName: string;
  private readonly storeName: string;

  constructor(options?: IndexedDbStoreOptions) {
    this.dbName = options?.dbName ?? "graphdown";
    this.storeName = options?.storeName ?? "kv";
  }

  private async openDatabase(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }
    if (typeof indexedDB === "undefined") {
      throw new Error("IndexedDB is unavailable in this environment.");
    }
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: "key" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return this.dbPromise;
  }

  private async withStore<T>(
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, mode);
      const store = transaction.objectStore(this.storeName);
      const request = fn(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async get<T>(key: string): Promise<T | undefined> {
    const record = await this.withStore<StoreRecord | undefined>("readonly", (store) =>
      store.get(key)
    );
    return record?.value as T | undefined;
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.withStore("readwrite", (store) => store.put({ key, value }));
  }

  async del(key: string): Promise<void> {
    await this.withStore("readwrite", (store) => store.delete(key));
  }

  async clear(): Promise<void> {
    await this.withStore("readwrite", (store) => store.clear());
  }

  async keys(prefix?: string): Promise<string[]> {
    const keys = await this.withStore<IDBValidKey[]>("readonly", (store) => store.getAllKeys());
    const stringKeys = keys.map((key) => String(key));
    if (!prefix) {
      return stringKeys;
    }
    return stringKeys.filter((key) => key.startsWith(prefix));
  }
}
