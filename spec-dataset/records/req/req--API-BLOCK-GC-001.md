---
typeId: req
recordId: API-BLOCK-GC-001
fields:
  title: Reachable block set computation is exposed
  order: 6
  testable: false
parent: section:16-2-block-object-read-api
---


The Runtime API MUST provide a deterministic method to compute the reachable block set per GC-001.

The returned set/list MUST be deterministic and SHOULD be sorted lexicographically by CID.

---