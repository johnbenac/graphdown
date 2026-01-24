---
typeId: req
recordId: VAL-PARENT-003
fields:
  title: Record hierarchy must be acyclic
  order: 9
  testable: true
parent: section:9-import-time-validity-and-integrity-rules
---
Following `parent` pointers from any record MUST terminate at a root record (missing/null `parent`).

If any cycle is present (including self-parenting), validation MUST fail.
