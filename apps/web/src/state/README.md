# Application state

The `state/` directory contains the dataset context used by route screens and
components to load, edit, and persist datasets.

## Dataset context

- `DatasetContext.tsx`
  - Exposes `DatasetProvider` and `useDataset`.
  - Orchestrates:
    1) import (zip or GitHub)
    2) validation (`validateDatasetSnapshot`)
    3) canonical record-only layout (`canonicalizeDatasetSnapshot`)
    4) Record Link Graph build (`buildRecordLinkGraphFromSnapshot`)
    5) Runtime API v1 open (`openRuntimeApiV1`)
    6) persistence (IndexedDB; required)

  - Tracks import progress stages, error states, and the active dataset.
  - Provides record editing helpers (`updateRecord`, `createRecord`) that:
    - update snapshot files
    - re-validate the snapshot
    - rebuild the Record Link Graph
    - open a Runtime API v1 session
    - persist changes
  - Runtime API v1 sessions are derived from canonical snapshots, rebuilt on load
    and after each snapshot change, and never persisted.

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
