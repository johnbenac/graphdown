---
typeId: "req"
recordId: "API-WRITE-005"
parent: "section:16p-1-mutations-and-atomic-commits"
fields:
  title: "Mutations must not rewrite unrelated files"
  testable: false
  order: 4
---

A mutation MUST NOT rewrite any record file bytes other than the specific files it intends to change.

Implementations MUST NOT “normalize” or reserialize unrelated record files as a side effect of edits (EXP-005).

---
