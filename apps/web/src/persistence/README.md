# Persistence layer

The persistence layer coordinates saving and loading:

- dataset snapshots (`DatasetSnapshot`)
- dataset metadata
- UI state

Persistence is implemented against a pluggable storage backend (IndexedDB in the web app).

## Core API

- `persistence.ts`
  - Exposes `createPersistence` to build a `Persistence` facade.
  - Saves the active dataset snapshot, UI state, and metadata.
  - Rehydrates the active dataset on load when snapshot + metadata are present.
  - Clears cached data when required entries are missing.

## Serialization

- `serializeSnapshot.ts`
  - Converts `DatasetSnapshot` maps to array payloads for storage.
  - Rehydrates snapshots back into `Map` instances.

## Metadata

- `types.ts`
  - Defines `DatasetMeta`, `PersistedDatasetSnapshot`, and `ImportReport` shapes.
- `keys.ts`
  - Names the storage keys used for the active dataset.

## Tests

- `persistence.unit.test.ts` validates persistence behavior and serialization round-trips.
