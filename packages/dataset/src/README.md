# Dataset package modules

This folder contains the canonical Graphdown dataset implementation.

## Module map

- `model/` — dataset type definitions (ids, references, snapshot types)
- `parse/` — Markdown/front matter parsing + dataset object discovery
- `validate/` — dataset validation rules and error surfaces
- `snapshot/` — hashing + canonicalization
- `graph/` — record link graph extraction/indexing
- `cid/` — CID helpers + base32 encoding
- `internal/` — shared helpers used across modules

## Entry point

`index.ts` re-exports the public API surface for consumers.
