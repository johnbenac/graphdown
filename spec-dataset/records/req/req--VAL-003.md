---
typeId: req
recordId: VAL-003
fields:
  title: Record objects must reference an existing type
  order: 3
  testable: true
parent: section:9-import-time-validity-and-integrity-rules
---


For every record object, its `typeId` MUST match exactly one type object `typeId`.
Validation MUST fail otherwise.