# Storage adapters

The storage layer abstracts persistence behind a small `PersistStore` interface.
IndexedDB is required for the web app.

## Interface

- `PersistStore.ts`
  - Defines the async CRUD contract (`get`, `set`, `delete`, optional `clear`).

## Implementation

- `indexedDbStore.ts`
  - Wraps IndexedDB with a key-value object store.
  - Lazily opens the database and serializes operations through `withStore`.
- `memoryStore.ts`
  - Provides an in-memory store for tests.

## Factory

- `createIndexedDbPersistStore`
  - Builds an IndexedDB-backed store and enforces that IndexedDB is available.
  - Throws (and logs) when IndexedDB is unavailable.
  - Supports optional database configuration.

## Tests

- `indexedDbStore.integration.test.ts` covers IndexedDB contract behavior.
