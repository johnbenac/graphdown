# Zip import/export

`zip/` wraps `fflate` helpers for moving Graphdown snapshots into and out of
zip archives.

## Key modules

- `zipSnapshot.ts`
  - `loadDatasetSnapshotFromZipBytes` converts zip bytes into a
    `DatasetSnapshot` with normalized paths.
  - `buildZipBytesFromSnapshot` writes a snapshot to zip bytes with
    optional include filtering and `.git` exclusion.
- `buildZip.ts`
  - Thin adapter that exports dataset zip bytes for the web app.

## Usage notes

- Path normalization rejects absolute paths, empty segments, and `..` traversal
  to keep zip extraction safe.
- The export path list is sorted for deterministic output ordering.
