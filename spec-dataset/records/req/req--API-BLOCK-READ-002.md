---
typeId: req
recordId: API-BLOCK-READ-002
fields:
  title: Block existence check by CID
  order: 3
  testable: false
parent: section:16-2-block-object-read-api
---


The Runtime API MUST provide a method to check whether a block exists for a given CID in the current snapshot.

This check MUST NOT require returning the block bytes.

---