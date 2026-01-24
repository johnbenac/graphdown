---
typeId: section
recordId: block-cid
fields:
  title: Block CID
  order: 11
  level: 3
parent: section:3-terminology
---
A **block CID** is a DASL CIDv1 string encoding:

* version: `0x01`
* codec: `0x55` (raw) or `0x71` (drisl/dag-cbor)
* hash type: `0x12` (sha2-256)
* hash size: `0x20` (32)
* digest: 32 bytes

The string form is base32 RFC4648 lowercase with no padding and prefixed with `b`.
