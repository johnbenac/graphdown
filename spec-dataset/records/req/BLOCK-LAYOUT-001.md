---
typeId: "req"
recordId: "BLOCK-LAYOUT-001"
parent: "section:4-repository-layout-requirements"
fields:
  title: "Block store paths are derived from CID"
  testable: true
  order: 3
---

Block objects MUST be stored under the dataset root at:

`blocks/sha2-256/<p>/<cid>`

Where:

* `<cid>` is the DASL CIDv1 string.
* `<p>` is the first byte of the CID digest encoded as two lowercase hex characters.

Examples:
* `blocks/sha2-256/0a/bafk...`
* `blocks/sha2-256/ff/bafk...`

Block files MUST be stored with the filename equal to `<cid>` exactly (no extension).
