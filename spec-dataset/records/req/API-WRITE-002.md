---
typeId: "req"
recordId: "API-WRITE-002"
parent: "section:16p-1-mutations-and-atomic-commits"
fields:
  title: "Type mutations are capability-gated"
  testable: false
  order: 1
---

If the Runtime API declares capability `gd.api.types.write`, it MUST expose type mutation operations including at least:

* create type object
* update type object
* delete type object

If the capability is not declared, these operations MAY be absent.

---
