# Storage adapters

The storage layer abstracts persistence behind a small `PersistStore` interface.
In production, Graphdown Web requires IndexedDB for persistence.

## Interface

- `PersistStore.ts`
  - Defines the async CRUD contract (`get`, `set`, `del`, `clear`, optional
    `keys`).

## Implementations

- `IndexedDbStore.ts`
  - Wraps IndexedDB with a key-value object store.
  - Lazily opens the database and serializes operations through `withStore`.
- `MemoryStore.ts`
  - Simple in-memory `Map` store used in tests only.

## Factory

- `createPersistStore.ts`
  - Enforces IndexedDB availability and returns an `IndexedDbStore`.
  - Throws with a clear error (and logs) when IndexedDB is unavailable.
  - Supports optional database configuration.

## Tests

- `PersistStore.test.ts` exercises the storage abstraction across the supported
  implementations.
