---
typeId: req
recordId: "ERR-002"
parent: "section:error-reporting-requirements"
fields:
  title: "Clear failure categories for GitHub import"
  order: 1
---


UI MUST differentiate at least:

* invalid URL format
* repo not found (404)
* private/auth required (401/403)
* rate limited (403 + hint)
* dataset invalid (structural/validation errors)

---
