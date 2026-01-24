---
typeId: req
recordId: VAL-COMP-001
fields:
  title: Composition referenced types must exist
  order: 6
parent: section:9-import-time-validity-and-integrity-rules
---


When a type object defines `fields.composition`, every referenced component `typeId` MUST match an existing type object. Validation MUST fail otherwise.