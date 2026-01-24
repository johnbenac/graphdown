---
typeId: req
recordId: ERR-002
fields:
  title: Clear failure categories for GitHub import
  order: 2
parent: section:10-error-reporting-requirements
---


UI MUST differentiate at least:

* invalid URL format
* repo not found (404)
* private/auth required (401/403)
* rate limited (403 + hint)
* dataset invalid (structural/validation errors)

---