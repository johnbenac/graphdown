---
typeId: "req"
recordId: "API-HIER-001"
parent: "section:16-1-read-access-to-derived-structures"
fields:
  title: "Record Hierarchy (parent pointers) is readable"
  testable: false
  order: 1
---

The Runtime API MUST provide read access to the **Record Hierarchy** derived only from record `parent` pointers (HIER-001), including at minimum:

* `getParent(recordKey)` (or equivalent)
* `listChildren(recordKey)` (or equivalent)

Results MUST reflect only `parent` pointers and MUST NOT be inferred from wiki-links or any other conventions.

---
