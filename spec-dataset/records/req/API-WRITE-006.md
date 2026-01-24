---
typeId: "req"
recordId: "API-WRITE-006"
parent: "section:16p-1-mutations-and-atomic-commits"
fields:
  title: "API-created objects must serialize as valid record files"
  testable: false
  order: 5
---

When the Runtime API creates or updates a type object or record object via structured inputs, it MUST persist the result as a Markdown record file conforming to:

* FR-MD-020/021 for types, or
* FR-MD-020/023 for records,

and MUST obey EXT-001 (no extra top-level keys).

---
