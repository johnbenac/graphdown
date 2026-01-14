# Storage adapters

The storage layer abstracts persistence behind a small `PersistStore` interface.
IndexedDB is required for the web app.

## Interface

- `PersistStore.ts`
  - Defines the async CRUD contract (`get`, `set`, `del`, `clear`, optional
    `keys`).

## Implementation

- `IndexedDbStore.ts`
  - Wraps IndexedDB with a key-value object store.
  - Lazily opens the database and serializes operations through `withStore`.

## Factory

- `createPersistStore.ts`
  - Builds an IndexedDB-backed store and enforces that IndexedDB is available.
  - Throws (and logs) when IndexedDB is unavailable.
  - Supports optional database configuration.

## Tests

- `PersistStore.unit.test.ts` exercises the storage abstraction.
- `createPersistStore.unit.test.ts` covers the IndexedDB capability checks.
