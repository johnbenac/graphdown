---
typeId: req
recordId: API-BLOCK-READ-001
fields:
  title: Resolve block bytes by CID
  order: 1
  commentGap: 1
  testable: false
parent: section:16-2-block-object-read-api
---
The Runtime API MUST provide a method to resolve a block CID to its raw bytes.

Resolution MUST fail if:

1. no block file exists at the canonical path derived from CID (BLOCK-LAYOUT-001), or
2. the block bytes do not match the CID’s embedded digest (VAL-BLOCK-001/002).

Returned bytes MUST be the raw bytes (BLOCK-001) with no normalization or decoding.

---
