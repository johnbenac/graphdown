# Persistence layer

The persistence layer coordinates saving and loading:

- dataset snapshots (`DatasetSnapshot`)
- a cached **Record Link Graph** representation (for fast UI rehydration)
- dataset metadata
- UI state

Persistence is implemented against a pluggable storage backend (IndexedDB in the web app).

## Core API

- `persistence.ts`
  - Exposes `createPersistence` to build a `Persistence` facade.
  - Saves the active dataset snapshot, Record Link Graph cache, UI state, and metadata.
  - Rehydrates the active dataset on load when snapshot + Record Link Graph cache are present.
  - Clears cached data when required entries are missing.

## Serialization

- `serializeSnapshot.ts`
  - Converts `DatasetSnapshot` maps to array payloads for storage.
  - Rehydrates snapshots back into `Map` instances.

- `serializeRecordLinkGraphCache.ts`
  - Serializes the **Record Link Graph cache**:
    - type nodes
    - record nodes
    - outgoing and incoming record-link adjacency lists
  - Rebuilds `RecordLinkGraph` instances with `Map`/`Set` collections on load.

> Note: This persisted “graph” is a cache of wiki-link relationships between records.
> It is not the record hierarchy (`parent:`) and not the type composition dependency graph.

## Metadata

- `types.ts`
  - Defines `DatasetMeta`, `PersistedDatasetSnapshot`, `PersistedRecordLinkGraphCache`, and `ImportReport` shapes.
- `keys.ts`
  - Names the storage keys used for the active dataset.

## Tests

- `persistence.unit.test.ts` validates persistence behavior and serialization round-trips.
