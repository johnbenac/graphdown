---
typeId: "req"
recordId: "API-READ-001"
parent: "section:required-read-operations-types-and-records"
fields:
  title: "List and get type objects"
  testable: false
  order: 0
---

The Runtime API MUST provide read operations to:

* list all type objects
* get a single type object by `typeId`

List results MUST be deterministic and SHOULD be sorted lexicographically by `typeId`.

---
