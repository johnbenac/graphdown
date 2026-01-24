---
typeId: req
recordId: "VAL-003"
parent: "section:import-time-validity-and-integrity-rules"
fields:
  title: "Record objects must reference an existing type"
  order: 2
  testable: true
---


For every record object, its `typeId` MUST match exactly one type object `typeId`.
Validation MUST fail otherwise.
