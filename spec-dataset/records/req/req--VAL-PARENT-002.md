---
typeId: req
recordId: VAL-PARENT-002
fields:
  title: Parent pointers must resolve
  order: 9
  testable: true
parent: section:9-import-time-validity-and-integrity-rules
---


For every record object with a non-null `parent` value, the referenced parent record MUST exist as a record object in the dataset.

Validation MUST fail otherwise.