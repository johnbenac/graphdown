# Persistence layer

The persistence layer coordinates saving and loading dataset snapshots, graphs,
metadata, and UI state to a pluggable storage backend.

## Core API

- `persistence.ts`
  - Exposes `createPersistence` to build a `Persistence` facade.
  - Saves the active dataset snapshot, graph cache, UI state, and metadata.
  - Rehydrates the active dataset on load, rebuilding the graph if the cached
    version is missing or incompatible.
  - Handles format-version checks and clears stale data when versions mismatch.

## Serialization

- `serializeSnapshot.ts`
  - Converts `DatasetSnapshot` maps to array payloads for storage.
  - Rehydrates snapshots back into `Map` instances.
- `serializeGraph.ts`
  - Serializes graph nodes + edges into plain arrays for storage.
  - Rebuilds `Graph` instances with `Map`/`Set` collections on load.

## Metadata + versioning

- `types.ts`
  - Defines `DatasetMeta`, `PersistedDatasetSnapshot`, `PersistedGraph`, and
    `ImportReport` shapes.
- `keys.ts`
  - Names the storage keys used for the active dataset.
- `versions.ts`
  - Defines the current format versions for snapshot, graph, and UI state.

## Tests

- `persistence.test.ts` validates the persistence behavior, including version
  handling and serialization round-trips.
