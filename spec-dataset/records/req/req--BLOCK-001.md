---
typeId: req
recordId: BLOCK-001
fields:
  title: Canonical block digest (sha256)
  order: 1
  testable: true
parent: section:3-2-block-identity
---


A block digest MUST be computed as:

* `SHA-256` over the block’s raw bytes (no normalization, no decoding).

The digest is embedded in the DASL CIDv1 encoding.