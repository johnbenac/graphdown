# Route screens

This directory contains the route-level screens rendered by `react-router`.
Each screen composes `components/` and reads from the dataset context.

## Routes

- `ImportRoute.tsx` (`/import`)
  - Main entry point for dataset import.
  - Supports GitHub URL import and an advanced zip upload flow.
  - Displays step-by-step progress, errors, and post-import warnings.
- `DatasetRoute.tsx` (`/datasets` and `/datasets/:recordTypeId`)
  - Browses dataset types and records.
  - Shows dataset metadata, type details, record lists, and record detail panes.
  - Drives the record editor/viewer modes for create/edit/read flows.
- `ExportRoute.tsx` (`/export`)
  - Provides dataset export options for the active snapshot.
  - Uses `exportDatasetZipBytes` + `downloadZipBytes` to generate zip downloads.

## Tests

- `DatasetRoute.test.tsx` covers navigation and record selection behaviors.
