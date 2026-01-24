---
typeId: req
recordId: "API-004"
parent: "section:runtime-api"
fields:
  title: "Runtime API addresses objects by GraphMD identities"
  order: 6
  testable: true
---


Runtime API methods MUST address GraphMD objects using GraphMD identities:

* type objects by `typeId`
* record objects by `recordKey = typeId:recordId` (or by `(typeId, recordId)`)

The Runtime API MUST NOT require clients to address types or records by repository file paths (LAYOUT-001).

---
