# Storage adapters

The storage layer abstracts persistence behind a small `PersistStore` interface
so the app can use IndexedDB when available and gracefully fall back to memory
in restricted environments.

## Interface

- `PersistStore.ts`
  - Defines the async CRUD contract (`get`, `set`, `del`, `clear`, optional
    `keys`).

## Implementations

- `IndexedDbStore.ts`
  - Wraps IndexedDB with a key-value object store.
  - Lazily opens the database and serializes operations through `withStore`.
- `MemoryStore.ts`
  - Simple in-memory `Map` store used in tests or when IndexedDB fails.

## Factory + fallback

- `createPersistStore.ts`
  - Builds the primary store and wraps it in a `FallbackStore` that switches to
    `MemoryStore` if IndexedDB throws errors.
  - Supports a `forceMemory` option (query param in the app) and optional
    database configuration.

## Tests

- `PersistStore.test.ts` exercises the storage abstraction across the supported
  implementations.
