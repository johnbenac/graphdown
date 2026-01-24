---
typeId: req
recordId: "VAL-PARENT-002"
parent: "section:import-time-validity-and-integrity-rules"
fields:
  title: "Parent pointers must resolve"
  order: 8
  testable: true
---


For every record object with a non-null `parent` value, the referenced parent record MUST exist as a record object in the dataset.

Validation MUST fail otherwise.
