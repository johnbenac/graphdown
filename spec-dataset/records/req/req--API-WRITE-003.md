---
typeId: req
recordId: API-WRITE-003
fields:
  title: All mutations validate the resulting dataset
  order: 3
  testable: false
parent: section:16p-1-mutations-and-atomic-commits
---


When any mutation is performed, the Runtime API MUST validate the resulting dataset snapshot against import-time validity rules (VAL-001).

If validation fails:

* the mutation MUST NOT be committed,
* the session MUST remain unchanged, and
* validation errors MUST be returned (ERR-001).

---