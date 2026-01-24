---
typeId: req
recordId: "API-BLOCK-001"
parent: "section:2-block-object-read-api"
fields:
  title: "Block identity is CID and blocks are immutable"
  order: 0
  testable: false
---


The Runtime API MUST treat a block object’s identity as its CID string.

Blocks MUST be immutable:

* the API MUST NOT define an operation that updates a block in-place under an existing CID.

(Write operations for blocks are parked in §16P.)

---
