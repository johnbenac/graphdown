# Persistence layer

The persistence layer coordinates saving and loading:

- dataset snapshots (`DatasetSnapshot`)
- dataset metadata
- UI state

Persistence is implemented against a pluggable storage backend (IndexedDB in the web app).

## Core API

- `createPersistence.ts`
  - Exposes `createPersistence` to build the persistence facade.
  - Saves the active dataset snapshot, UI state, and metadata.
  - Rehydrates the active dataset on load when snapshot + metadata are present.
  - Clears cached data when stored entries are missing or corrupt.

## Serialization

- `codec/snapshotCodec.ts`
  - Converts `DatasetSnapshot` maps to deterministic array payloads for storage.
  - Rehydrates snapshots back into `Map` instances.
- `codec/legacySnapshotCodec.ts`
  - Supports the legacy snapshot payload used by earlier web app versions.

## Metadata & Schema

- `types.ts`
  - Defines `DatasetMeta`, `PersistedDatasetSnapshot`, and `ImportReport` shapes.
- `schema/persistedActiveDataset.ts`
  - Defines the versioned persisted record and validation helpers.

## Tests

- `codec/__tests__/snapshotCodec.unit.test.ts`
- `schema/__tests__/persistedActiveDataset.unit.test.ts`
- `__tests__/createPersistence.unit.test.ts`
