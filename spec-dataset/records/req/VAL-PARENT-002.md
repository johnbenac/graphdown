---
typeId: "req"
recordId: "VAL-PARENT-002"
parent: "section:9-import-time-validity-and-integrity-rules"
fields:
  title: "Parent pointers must resolve"
  testable: true
  order: 8
---

For every record object with a non-null `parent` value, the referenced parent record MUST exist as a record object in the dataset.

Validation MUST fail otherwise.
