---
typeId: req
recordId: API-WRITE-001
fields:
  title: Record mutations are capability-gated
  order: 0
  commentGap: 1
  testable: false
parent: section:16p-1-mutations-and-atomic-commits
---
If the Runtime API declares capability `gd.api.records.write`, it MUST expose record mutation operations including at least:

* create record
* update record
* delete record

If the capability is not declared, these operations MAY be absent. If present but capability is not declared, they MUST fail without mutating session state.

---
