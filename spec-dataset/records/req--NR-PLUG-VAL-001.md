---
typeId: req
recordId: "NR-PLUG-VAL-001"
parent: "section:explicit-non-requirements"
fields:
  title: "No plugin-defined dataset validity rules"
  order: 6
  testable: true
  verify: "ci"
---


Core validation (VAL-001 and related requirements) MUST NOT depend on executing plugins or interpreting plugin bundle content.
Plugins MUST NOT be able to make an otherwise-valid dataset invalid for import/export conformance.
