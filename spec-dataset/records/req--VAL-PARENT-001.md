---
typeId: req
recordId: "VAL-PARENT-001"
parent: "section:import-time-validity-and-integrity-rules"
fields:
  title: "Parent field shape is strict"
  order: 7
  testable: true
---


For every record object:
* If `parent` is missing or null: valid (root).
* If `parent` is present and non-null: it MUST be a string record reference `typeId:recordId` satisfying ID-001 for both parts.

Validation MUST fail otherwise.
