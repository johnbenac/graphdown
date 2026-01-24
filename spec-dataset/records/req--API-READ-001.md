---
typeId: req
recordId: "API-READ-001"
parent: "section:runtime-api"
fields:
  title: "List and get type objects"
  order: 16
  testable: false
---


The Runtime API MUST provide read operations to:

* list all type objects
* get a single type object by `typeId`

List results MUST be deterministic and SHOULD be sorted lexicographically by `typeId`.

---
