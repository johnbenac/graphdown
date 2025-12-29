export interface PersistStore {
  /** Returns undefined if not found */
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  del(key: string): Promise<void>;
  clear(): Promise<void>;

  /** Optional but useful for debugging / listing */
  keys?(prefix?: string): Promise<string[]>;
}
