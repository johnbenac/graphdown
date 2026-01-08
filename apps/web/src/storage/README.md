# Storage adapters

The storage layer abstracts persistence behind a small `PersistStore` interface.
IndexedDB is required for the web app; there is no runtime fallback.

## Interface

- `PersistStore.ts`
  - Defines the async CRUD contract (`get`, `set`, `del`, `clear`, optional
    `keys`).

## Implementations

- `IndexedDbStore.ts`
  - Wraps IndexedDB with a key-value object store.
  - Lazily opens the database and serializes operations through `withStore`.
- `MemoryStore.ts`
  - Simple in-memory `Map` store used in tests or dev harnesses only.

## Factory

- `createPersistStore.ts`
  - Builds an IndexedDB-backed store and enforces that IndexedDB is available.
  - Throws (and logs) when IndexedDB is unavailable; there is no fallback.
  - Supports optional database configuration.

## Tests

- `PersistStore.test.ts` exercises the storage abstraction across the supported
  implementations.
