---
typeId: "req"
recordId: "API-READ-002"
parent: "section:required-read-operations-types-and-records"
fields:
  title: "List and get record objects"
  testable: false
  order: 1
---

The Runtime API MUST provide read operations to:

* list record objects by `typeId`
* get a single record object by `recordKey` (or by `(typeId, recordId)`)

List results MUST be deterministic and SHOULD be sorted lexicographically by `recordId`.

---
