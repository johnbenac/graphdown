---
typeId: req
recordId: API-BLOCK-READ-003
fields:
  title: List blocks present in the snapshot
  order: 3
  commentGap: 1
  testable: false
parent: section:16-2-block-object-read-api
---
The Runtime API MUST provide a method to list block CIDs present in the current snapshot (including garbage blocks; GC-003).

The list MUST be deterministic and SHOULD be sorted lexicographically by CID.

---
