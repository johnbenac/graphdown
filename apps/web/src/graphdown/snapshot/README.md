# Snapshot helpers

`snapshot/` contains utilities that transform or summarize a `DatasetSnapshot`.

## Key modules

- `canonicalizeDatasetSnapshot.ts`
  - Rewrites a snapshot into the **canonical record-only layout**:
    - types in `types/<typeId>.md`
    - records nested under `records/<typeId>.<recordId>/.../<recordId>.md` using `parent:` pointers
    - reachable blocks only (derived from CID references)
  - Preserves original bytes for the canonical paths (it changes paths, not content).

  This canonicalization is a *layout* operation (filesystem tree), not a semantic “graph” operation.

- `hash.ts`
  - Computes deterministic Graphdown hashes (`graphdown:gdhash:v1`) for schema-only or full snapshots.
  - Parses record/type files, normalizes line endings (for hashing only), and hashes content in stable identity order.

## Usage notes

- Canonicalization relies on `discoverGraphdownObjects` parsing behavior; parsing errors should be handled upstream.
- Hashing returns validation errors if UTF-8 decoding or parsing fails.
