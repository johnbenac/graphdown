---
typeId: req
recordId: NR-LINK-001
fields:
  title: No requirement that links resolve (except composition constraints)
  order: 5
parent: section:2-explicit-non-requirements
---


Wiki-links MAY point to non-existent record references `typeId:recordId` (Obsidian-style “uncreated” notes). Unresolved links are not an import-failing error.

This non-requirement applies only to wiki-links extracted from record bodies and record `fields` (REL-002).
It does not apply to record hierarchy parent pointers (HIER-001): parent pointers MUST resolve and are import-failing when missing (VAL-PARENT-002).

Exception: unresolved links **do not** satisfy composition constraints (VAL-COMP-002). Import MUST fail when composition requirements are unmet. Unresolved block references are an import-failing error (VAL-BLOCK-001).