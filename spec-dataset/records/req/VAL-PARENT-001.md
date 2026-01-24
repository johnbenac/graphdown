---
typeId: "req"
recordId: "VAL-PARENT-001"
parent: "section:9-import-time-validity-and-integrity-rules"
fields:
  title: "Parent field shape is strict"
  testable: true
  order: 7
---

For every record object:
* If `parent` is missing or null: valid (root).
* If `parent` is present and non-null: it MUST be a string record reference `typeId:recordId` satisfying ID-001 for both parts.

Validation MUST fail otherwise.
