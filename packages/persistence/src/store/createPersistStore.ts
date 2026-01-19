import { createIndexedDbPersistStore } from "./indexedDbStore";
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
  try {
    return createIndexedDbPersistStore({
      dbName: options?.dbName,
      storeName: options?.storeName
    });
  } catch (err) {
    if (err instanceof Error) {
      logger.error(err.message, err);
    }
    throw err;
  }
}
