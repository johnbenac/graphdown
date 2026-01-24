---
typeId: req
recordId: API-DET-002
fields:
  title: List order is stable and documented
  order: 1
  commentGap: 1
  testable: false
parent: section:16-3-determinism-requirements
---
Any Runtime API method that returns a list MUST define a stable ordering rule.

Unless otherwise documented, list ordering SHOULD be lexicographic by identity string (e.g. `typeId`, `recordId`, `recordKey`, `cid`).

---

---
