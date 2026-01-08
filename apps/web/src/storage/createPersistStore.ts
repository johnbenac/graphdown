import { IndexedDbStore } from "./IndexedDbStore";
import type { PersistStore } from "./PersistStore";

type Logger = {
  error: (message: string, error?: unknown) => void;
};

type CreatePersistStoreOptions = {
  logger?: Logger;
  dbName?: string;
  storeName?: string;
};

export function createPersistStore(options?: CreatePersistStoreOptions): PersistStore {
  const logger = options?.logger ?? console;

  if (typeof indexedDB === "undefined") {
    const err = new Error(
      [
        "Graphdown Web requires IndexedDB for persistence, but IndexedDB is unavailable.",
        "",
        "This environment is not supported (e.g. restricted webview, storage disabled, or non-browser runtime).",
        "Graphdown does not fall back to in-memory storage."
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
