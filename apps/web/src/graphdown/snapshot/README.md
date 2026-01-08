# Snapshot helpers

`snapshot/` contains utilities that transform or summarize a
`DatasetSnapshot`.

## Key modules

- `canonicalizeDatasetSnapshot.ts`
  - Rewrites a snapshot into canonical layout (`types/`, nested
    `records/<type>.<id>/`, and reachable blobs only).
  - Computes record directory paths from parent relationships and preserves
    original bytes for canonical paths.
- `hash.ts`
  - Computes deterministic Graphdown hashes (`graphdown:gdhash:v1`) for schema
    or full snapshots.
  - Parses record/type files, normalizes line endings, and hashes content in
    stable identity order.

## Usage notes

- Canonicalization relies on `discoverGraphdownObjects` parsing behavior, so
  parsing errors should be handled upstream.
- Hashing returns validation errors if UTF-8 decoding or parsing fails.
