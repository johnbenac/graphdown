---
typeId: req
recordId: "API-BLOCK-WRITE-002"
parent: "section:p-2-block-writes-and-garbage-collection"
fields:
  title: "Block insertion is idempotent"
  order: 1
  testable: false
---


If block insertion is supported, inserting bytes whose CID already exists MUST succeed and MUST return the same CID.

The operation MUST NOT create duplicates and MUST NOT rewrite existing bytes if they already match the CID.

---
