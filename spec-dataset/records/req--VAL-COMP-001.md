---
typeId: req
recordId: "VAL-COMP-001"
parent: "section:import-time-validity-and-integrity-rules"
fields:
  title: "Composition referenced types must exist"
  order: 5
---


When a type object defines `fields.composition`, every referenced component `typeId` MUST match an existing type object. Validation MUST fail otherwise.
