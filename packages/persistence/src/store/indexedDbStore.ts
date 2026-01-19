import type { PersistStore } from "./PersistStore";

type IndexedDbStoreOptions = {
  dbName?: string;
  storeName?: string;
};

type StoreRecord = {
  key: string;
  value: unknown;
};

type Logger = {
  error: (message: string, error?: unknown) => void;
};

type CreateIndexedDbPersistStoreOptions = {
  logger?: Logger;
  dbName?: string;
  storeName?: string;
};

const trackedDbNames = new Set<string>();

export function listTrackedDbNames(): string[] {
  return [...trackedDbNames];
}

export function clearTrackedDbNames(): void {
  trackedDbNames.clear();
}

export async function deleteTrackedDbNames(): Promise<void> {
  const idb = typeof indexedDB === "undefined" ? undefined : indexedDB;
  const names = [...trackedDbNames];
  trackedDbNames.clear();
  if (!idb || typeof idb.deleteDatabase !== "function" || names.length === 0) {
    return;
  }
  await Promise.all(
    names.map(
      (name) =>
        new Promise<void>((resolve) => {
          const request = idb.deleteDatabase(name);
          const timeoutId = setTimeout(resolve, 50);
          const finish = () => {
            clearTimeout(timeoutId);
            resolve();
          };
          request.onsuccess = finish;
          request.onerror = finish;
          request.onblocked = finish;
        })
    )
  );
}

export function createIndexedDbPersistStore(
  options?: CreateIndexedDbPersistStoreOptions
): PersistStore {
  const logger = options?.logger ?? console;

  if (typeof indexedDB === "undefined") {
    const err = new Error(
      [
        "Graphdown Web requires IndexedDB for persistence, but IndexedDB is unavailable.",
        "",
        "This environment is not supported (e.g. restricted webview, storage disabled, or non-browser runtime)."
      ].join("\n")
    );
    logger.error(err.message, err);
    throw err;
  }

  return new IndexedDbStore({
    dbName: options?.dbName,
    storeName: options?.storeName
  });
}

export class IndexedDbStore implements PersistStore {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private readonly dbName: string;
  private readonly storeName: string;

  constructor(options?: IndexedDbStoreOptions) {
    this.dbName = options?.dbName ?? "graphdown";
    this.storeName = options?.storeName ?? "kv";
    trackedDbNames.add(this.dbName);
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

  async close(): Promise<void> {
    if (!this.dbPromise) {
      return;
    }
    try {
      const db = await this.dbPromise;
      db.close();
    } catch {
      // best effort; ignore close errors
    }
    this.dbPromise = null;
  }

  async destroy(): Promise<void> {
    const idb = typeof indexedDB === "undefined" ? undefined : indexedDB;
    if (!idb || typeof idb.deleteDatabase !== "function") {
      return;
    }
    if (this.dbPromise) {
      try {
        await this.clear();
        const db = await this.dbPromise;
        db.close();
      } catch {
        // best effort; ignore destroy errors
      }
    }
    this.dbPromise = null;
    trackedDbNames.delete(this.dbName);
    await new Promise<void>((resolve) => {
      const request = idb.deleteDatabase(this.dbName);
      const timeoutId = setTimeout(resolve, 50);
      const finish = () => {
        clearTimeout(timeoutId);
        resolve();
      };
      request.onsuccess = finish;
      request.onerror = finish;
      request.onblocked = finish;
    });
  }

  private async withStore<T>(
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, mode);
      const store = transaction.objectStore(this.storeName);
      let result: T;
      const request = fn(store);
      request.onsuccess = () => {
        result = request.result;
      };
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  async get(key: string): Promise<unknown | undefined> {
    const record = await this.withStore<StoreRecord | undefined>("readonly", (store) =>
      store.get(key)
    );
    return record?.value;
  }

  async set(key: string, value: unknown): Promise<void> {
    await this.withStore("readwrite", (store) => store.put({ key, value }));
  }

  async delete(key: string): Promise<void> {
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
