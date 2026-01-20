# Application state

The `state/` directory contains the dataset context used by route screens and
components to load, edit, and persist datasets.

## Dataset context

- `DatasetContext.tsx`
  - Exposes `DatasetProvider` and `useDataset`.
  - Orchestrates:
    1) import (zip or GitHub)
    2) canonical record-only layout (`canonicalizeDatasetSnapshot`, import only)
    3) delegates session opening + snapshot indexing + import report building to `@graphdown/app-kit`
       - openDatasetSession (validate snapshot, open Runtime API v1 session, build snapshot index)
    4) persistence (IndexedDB; required)

  - Runtime sessions are derived from snapshots, rebuilt on load and every
    snapshot update, and never persisted.

  - Runtime API v1 is the read model; snapshot bytes are the persistence/write
    substrate.
  - Tracks import progress stages, error states, and the active dataset.
  - Provides record editing helpers (`updateRecord`, `createRecord`) that:
    - update snapshot files
    - open a new runtime session + snapshot index
    - persist changes

  - Registers a debug helper on `window.__appDebug` to clear persistence.

## Tests

- `DatasetContext.unit.test.tsx` and `DatasetContext.nfr.integration.test.tsx` cover import and
  update workflows.
