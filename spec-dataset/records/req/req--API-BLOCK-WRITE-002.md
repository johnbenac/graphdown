---
typeId: req
recordId: API-BLOCK-WRITE-002
fields:
  title: Block insertion is idempotent
  order: 2
  testable: false
parent: section:16p-2-block-writes-and-garbage-collection
---


If block insertion is supported, inserting bytes whose CID already exists MUST succeed and MUST return the same CID.

The operation MUST NOT create duplicates and MUST NOT rewrite existing bytes if they already match the CID.

---