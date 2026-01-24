---
typeId: req
recordId: API-BLOCK-001
fields:
  title: Block identity is CID and blocks are immutable
  order: 0
  commentGap: 1
  testable: false
parent: section:16-2-block-object-read-api
---
The Runtime API MUST treat a block object’s identity as its CID string.

Blocks MUST be immutable:

* the API MUST NOT define an operation that updates a block in-place under an existing CID.

(Write operations for blocks are parked in §16P.)

---
