import { openDB } from "idb";
import type { IDBPDatabase } from "idb";
import type { PersistStore } from "./PersistStore";

const DEFAULT_DB_NAME = "graphdown";
const DEFAULT_STORE_NAME = "kv";
const DEFAULT_DB_VERSION = 1;

interface IndexedDbStoreOptions {
  dbName?: string;
  storeName?: string;
  version?: number;
}

export class IndexedDbStore implements PersistStore {
  private dbPromise: Promise<IDBPDatabase>;
  private storeName: string;

  constructor(options: IndexedDbStoreOptions = {}) {
    const dbName = options.dbName ?? DEFAULT_DB_NAME;
    this.storeName = options.storeName ?? DEFAULT_STORE_NAME;
    const version = options.version ?? DEFAULT_DB_VERSION;

    if (typeof indexedDB === "undefined") {
      this.dbPromise = Promise.reject(new Error("IndexedDB is unavailable in this environment."));
      return;
    }

    this.dbPromise = openDB(dbName, version, {
      upgrade: (db) => {
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      },
    });
  }

  private async withDb<T>(action: (db: IDBPDatabase) => Promise<T>): Promise<T> {
    try {
      const db = await this.dbPromise;
      return await action(db);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`IndexedDB operation failed: ${message}`);
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    return this.withDb(async (db) => (await db.get(this.storeName, key)) as T | undefined);
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.withDb(async (db) => {
      await db.put(this.storeName, value, key);
    });
  }

  async del(key: string): Promise<void> {
    await this.withDb(async (db) => {
      await db.delete(this.storeName, key);
    });
  }

  async clear(): Promise<void> {
    await this.withDb(async (db) => {
      await db.clear(this.storeName);
    });
  }

  async keys(prefix?: string): Promise<string[]> {
    return this.withDb(async (db) => {
      const keys = (await db.getAllKeys(this.storeName)) as string[];
      if (!prefix) {
        return keys;
      }
      return keys.filter((key) => key.startsWith(prefix));
    });
  }
}
