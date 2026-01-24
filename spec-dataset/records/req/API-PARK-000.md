---
typeId: req
recordId: API-PARK-000
fields:
  title: Parked requirements are capability-conditional
  order: 0
  commentGap: 1
  testable: false
parent: section:16p-runtime-api-parked-requirements
---
Requirements in §16P apply only when the implementation exposes the corresponding capability in `capabilities` (API-002).

Implementations MUST NOT claim a capability unless they satisfy all requirements associated with that capability.

---
