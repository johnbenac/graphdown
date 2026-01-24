---
typeId: req
recordId: API-005
fields:
  title: Runtime API payloads are structured-clone compatible
  order: 5
  testable: false
parent: section:versioning-capabilities-and-general-contract-rules
---


All request/response payloads used by the Runtime API MUST be representable using structured-clone-compatible values:

* primitives, arrays, plain objects
* `Uint8Array` for bytes is allowed

The API MUST NOT require functions, class instances, or other non-clonable values as data payloads.

---