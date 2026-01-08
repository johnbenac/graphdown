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
  - Rehydrates the active dataset on load, rebuilding the Record Link Graph cache if missing or incompatible.
  - Handles format-version checks and clears stale data when versions mismatch.

## Serialization

- `serializeSnapshot.ts`
  - Converts `DatasetSnapshot` maps to array payloads for storage.
  - Rehydrates snapshots back into `Map` instances.

- `serializeGraph.ts`
  - Serializes the **Record Link Graph cache**:
    - type nodes
    - record nodes
    - outgoing and incoming record-link adjacency lists
  - Rebuilds `Graph` instances with `Map`/`Set` collections on load.

> Note: This persisted “graph” is a cache of wiki-link relationships between records.
> It is not the record hierarchy (`parent:`) and not the type composition dependency graph.

## Metadata + versioning

- `types.ts`
  - Defines `DatasetMeta`, `PersistedDatasetSnapshot`, `PersistedGraph`, and `ImportReport` shapes.
- `keys.ts`
  - Names the storage keys used for the active dataset.
- `versions.ts`
  - Defines the current format versions for snapshot, graph cache, and UI state.

## Tests

- `persistence.test.ts` validates persistence behavior, including version handling and serialization round-trips.
