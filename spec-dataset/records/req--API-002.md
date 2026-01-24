---
typeId: req
recordId: "API-002"
parent: "section:runtime-api"
fields:
  title: "Capabilities are discoverable"
  order: 4
  testable: true
---


The Runtime API MUST expose a machine-readable set of supported capabilities for the current session.

* Capabilities MUST be stable string identifiers.
* Capability discovery MUST NOT require performing any mutation.

A v1 implementation MUST declare at least capability:

* `gd.api.read`

---
