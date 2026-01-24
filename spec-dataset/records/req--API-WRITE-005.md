---
typeId: req
recordId: "API-WRITE-005"
parent: "section:p-1-mutations-and-atomic-commits"
fields:
  title: "Mutations must not rewrite unrelated files"
  order: 4
  testable: false
---


A mutation MUST NOT rewrite any record file bytes other than the specific files it intends to change.

Implementations MUST NOT “normalize” or reserialize unrelated record files as a side effect of edits (EXP-005).

---
