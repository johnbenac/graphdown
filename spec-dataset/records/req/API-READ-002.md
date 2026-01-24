---
typeId: req
recordId: API-READ-002
fields:
  title: List and get record objects
  order: 1
  commentGap: 1
  testable: false
parent: section:required-read-operations-types-and-records
---
The Runtime API MUST provide read operations to:

* list record objects by `typeId`
* get a single record object by `recordKey` (or by `(typeId, recordId)`)

List results MUST be deterministic and SHOULD be sorted lexicographically by `recordId`.

---
