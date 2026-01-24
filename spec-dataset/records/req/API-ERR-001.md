---
typeId: "req"
recordId: "API-ERR-001"
parent: "section:versioning-capabilities-and-general-contract-rules"
fields:
  title: "Errors are structured and include stable codes"
  testable: false
  order: 5
---

If a Runtime API operation fails, it MUST fail with a structured error that includes:

* a stable error code string, and
* a human-readable message.

When applicable, errors SHOULD include:

* a file path (ERR-001), and/or
* a hint string.

Notes:

* This requirement constrains shape, not the transport (return-value vs promise rejection).
* Validation failures MUST return the underlying validation errors with stable codes and file attribution when applicable (ERR-001).

---
