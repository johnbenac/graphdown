---
typeId: req
recordId: "EXP-006"
parent: "section:export-requirements"
fields:
  title: "Canonical dataset export includes reachable blocks"
  order: 1
  testable: true
---


The canonical dataset export (EXP-003) MUST include all block store files whose CIDs are in the reachable block set (GC-001), preserving their canonical block store paths (BLOCK-LAYOUT-001).

Reachable blocks include both record-extracted references and plugin-declared block dependencies (GC-001).
