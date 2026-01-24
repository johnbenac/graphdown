---
typeId: req
recordId: "API-PARK-000"
parent: "section:p-runtime-api-parked-requirements"
fields:
  title: "Parked requirements are capability-conditional"
  order: 0
  testable: false
---


Requirements in §16P apply only when the implementation exposes the corresponding capability in `capabilities` (API-002).

Implementations MUST NOT claim a capability unless they satisfy all requirements associated with that capability.

---
