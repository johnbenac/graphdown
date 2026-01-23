# Dataset module map

This folder contains the canonical dataset semantics used across GraphMD.

## Module overview

- `model/` — identity and snapshot types.
- `parse/` — YAML/front-matter parsing and record discovery.
- `validate/` — dataset validation rules and error helpers.
- `snapshot/` — hashing and canonicalization.
- `graph/` — record link graph extraction.
- `cid/` — DASL CID helpers.
- `internal/` — shared low-level helpers.

The public API is exported from `../index.ts`.
