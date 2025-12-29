export interface PersistStore {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  del(key: string): Promise<void>;
  clear(): Promise<void>;
  keys?(prefix?: string): Promise<string[]>;
}
