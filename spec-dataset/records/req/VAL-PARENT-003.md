---
typeId: "req"
recordId: "VAL-PARENT-003"
parent: "section:9-import-time-validity-and-integrity-rules"
fields:
  title: "Record hierarchy must be acyclic"
  testable: true
  order: 9
---

Following `parent` pointers from any record MUST terminate at a root record (missing/null `parent`).

If any cycle is present (including self-parenting), validation MUST fail.
