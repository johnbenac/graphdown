# Application state

The `state/` directory contains the dataset context used by route screens and
components to load, edit, and persist datasets.

## Dataset context

- `DatasetContext.tsx`
  - Exposes `DatasetProvider` and `useDataset` for the rest of the app.
  - Orchestrates import flows (zip or GitHub), validation, canonicalization,
    graph building, and persistence.
  - Tracks import progress stages, error states, and the active dataset.
  - Provides record editing helpers (`updateRecord`, `createRecord`) that update
    the snapshot, re-validate it, rebuild the graph, and save changes.
  - Registers a debug helper on `window.__appDebug` to clear persistence.

## Import reports

- `importReport.ts`
  - Compares raw vs canonical snapshots to report ignored files and dropped
    unreferenced blobs.
  - Limits report samples to keep UI payloads small.

## Tests

- `DatasetContext.test.tsx` and `DatasetContext.nfr.test.tsx` cover import and
  update workflows.
- `importReport.test.ts` verifies report counting and sample limits.
