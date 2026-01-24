---
typeId: req
recordId: "BLOCK-001"
parent: "section:2-block-identity"
fields:
  title: "Canonical block digest (sha256)"
  order: 0
  testable: true
---


A block digest MUST be computed as:

* `SHA-256` over the block’s raw bytes (no normalization, no decoding).

The digest is embedded in the DASL CIDv1 encoding.
