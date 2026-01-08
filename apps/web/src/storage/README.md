# Storage adapters

The storage layer abstracts persistence behind a small `PersistStore` interface.
Graphdown Web requires IndexedDB for persistence and does not fall back to
in-memory storage in unsupported environments.

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
  - Builds the IndexedDB-backed store used in production.
  - Throws if IndexedDB is unavailable.
  - Supports optional database configuration.

## Tests

- `PersistStore.test.ts` exercises the storage abstraction across the supported
  implementations.
