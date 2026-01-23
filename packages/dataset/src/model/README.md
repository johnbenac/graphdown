# Model primitives

`model/` contains the shared types and helpers that define GraphMD’s in-memory
shape for datasets.

## Files

- `snapshotTypes.ts`
  - Defines `DatasetSnapshot`, the in-memory representation of dataset files as
    a `Map<string, Uint8Array>`.
- `types.ts`
  - Shared type aliases (`RecordFields`, `MarkdownTypeObject`,
    `MarkdownRecordObject`) and low-level helpers like `isObject` and
    `getString`.
- `ids.ts`
  - `cleanId` normalizes identifiers by trimming whitespace and stripping
    surrounding `[[...]]` tokens.
- `refs.ts`
  - Reference helpers (`normalizeRef`, `normalizeRefs`) built on top of
    `cleanId`.

## Usage notes

- These helpers are intentionally small and dependency-free so they can be
  reused across parsing, validation, and graph building.
