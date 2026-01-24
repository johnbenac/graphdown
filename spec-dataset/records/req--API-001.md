---
typeId: req
recordId: "API-001"
parent: "section:runtime-api"
fields:
  title: "Runtime API is explicitly versioned"
  order: 3
  testable: true
---


The Runtime API MUST expose a machine-readable `apiVersion`.

* `apiVersion` MUST be an integer.
* A Runtime API v1 implementation MUST report `apiVersion = 1`.
* Backward-incompatible changes to the Runtime API contract MUST increment `apiVersion`.

---
