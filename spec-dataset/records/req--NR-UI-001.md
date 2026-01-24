---
typeId: req
recordId: "NR-UI-001"
parent: "section:explicit-non-requirements"
fields:
  title: "No standardized UI hints"
  order: 0
  testable: false
---


This standard defines no standardized “UI hints” keys, formats, or semantics inside `fields`.

Datasets MAY include arbitrary UI-hint-like keys inside `fields` (e.g. `ui`, `widget`, `label`), but core behavior MUST NOT depend on them and will ignore them.
