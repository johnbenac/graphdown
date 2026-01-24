---
typeId: req
recordId: "API-WRITE-003"
parent: "section:p-1-mutations-and-atomic-commits"
fields:
  title: "All mutations validate the resulting dataset"
  order: 2
  testable: false
---


When any mutation is performed, the Runtime API MUST validate the resulting dataset snapshot against import-time validity rules (VAL-001).

If validation fails:

* the mutation MUST NOT be committed,
* the session MUST remain unchanged, and
* validation errors MUST be returned (ERR-001).

---
