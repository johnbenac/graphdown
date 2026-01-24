---
typeId: "req"
recordId: "NR-PLUG-EXP-001"
parent: "section:2-explicit-non-requirements"
fields:
  title: "Plugins do not define canonical export"
  testable: true
  verify: "ci"
  order: 7
---

Canonical export (EXP-003 and related requirements) is defined by core.
Plugins MUST NOT modify which files are included, how they are laid out, or how bytes are rewritten for canonical export.
