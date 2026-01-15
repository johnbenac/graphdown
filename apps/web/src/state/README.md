# Application state

The `state/` directory contains the dataset context used by route screens and
components to load, edit, and persist datasets.

## Dataset context

- `DatasetContext.tsx`
  - Exposes `DatasetProvider` and `useDataset`.
  - Orchestrates:
    1) import (zip or GitHub)
    2) canonical record-only layout (`canonicalizeDatasetSnapshot`, import only)
    3) openDatasetSession:
       - validate snapshot (`validateDatasetSnapshot`)
       - open Runtime API v1 session (`openRuntimeApiV1`)
       - build snapshot index (`buildSnapshotIndex`)
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

## Import reports

- `importReport.ts`
  - Compares raw vs canonical snapshots to report ignored files and dropped
    unreferenced blocks.
  - Limits report samples to keep UI payloads small.

## Tests

- `DatasetContext.unit.test.tsx` and `DatasetContext.nfr.integration.test.tsx` cover import and
  update workflows.
- `importReport.unit.test.ts` verifies report counting and sample limits.
