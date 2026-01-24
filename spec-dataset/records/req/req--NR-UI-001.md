---
typeId: req
recordId: NR-UI-001
fields:
  title: No standardized UI hints
  order: 1
  testable: false
parent: section:2-explicit-non-requirements
---


This standard defines no standardized “UI hints” keys, formats, or semantics inside `fields`.

Datasets MAY include arbitrary UI-hint-like keys inside `fields` (e.g. `ui`, `widget`, `label`), but core behavior MUST NOT depend on them and will ignore them.