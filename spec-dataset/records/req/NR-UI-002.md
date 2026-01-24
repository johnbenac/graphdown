---
typeId: "req"
recordId: "NR-UI-002"
parent: "section:2-explicit-non-requirements"
fields:
  title: "UI hint keys are ignored by core validation"
  testable: true
  order: 1
---

Core validation MUST treat all non-reserved keys inside `fields` as opaque, including keys commonly used as UI hints (e.g. `ui`, `widget`, `label`).
Datasets MUST NOT be rejected due to the presence, absence, or shape of such keys.

(Plugins MAY interpret any dataset content; that is explicitly out-of-scope of core.)
