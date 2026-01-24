---
typeId: "req"
recordId: "API-BLOCK-WRITE-001"
parent: "section:16p-2-block-writes-and-garbage-collection"
fields:
  title: "Block insertion by bytes returns CID"
  testable: false
  order: 0
---

If the Runtime API declares capability `gd.api.blocks.write`, it MUST provide an operation to add block bytes, returning the computed CID.

The CID MUST be computed per BLOCK-001 and encoded as a DASL CIDv1 string.

The block bytes MUST be stored at the canonical block store path (BLOCK-LAYOUT-001).

---
