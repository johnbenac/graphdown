# Dataset package module map

This directory contains the canonical Graphdown dataset semantics. Key areas:

- `model/`: core types and ID utilities.
- `parse/`: snapshot parsing (front matter, markdown records, plugin manifests).
- `validate/`: dataset validation rules.
- `snapshot/`: hashing + canonicalization helpers.
- `graph/`: record link graph extraction.
- `cid/`: CID helpers.
- `internal/`: shared internal utilities.

The package entrypoint is `index.ts`.
