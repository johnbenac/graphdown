---
typeId: "req"
recordId: "API-TXN-001"
parent: "section:16p-4-change-notifications-and-transactions"
fields:
  title: "API supports explicit transactions"
  testable: false
  order: 1
---

If the Runtime API declares capability `gd.api.transactions`, it MAY provide explicit transaction controls (begin/commit/rollback or equivalent).

If provided, transaction semantics MUST preserve atomicity and validation requirements (API-WRITE-003/004).

---
