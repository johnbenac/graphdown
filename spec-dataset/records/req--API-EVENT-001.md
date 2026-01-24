---
typeId: req
recordId: "API-EVENT-001"
parent: "section:p-4-change-notifications-and-transactions"
fields:
  title: "API provides change notifications"
  order: 0
  testable: false
---


If the Runtime API declares capability `gd.api.events`, it SHOULD provide a mechanism for clients to observe committed dataset changes.

If provided:

* notifications MUST fire only after a successful atomic commit (API-WRITE-004),
* and MUST include enough identity information to refresh state deterministically.

---
