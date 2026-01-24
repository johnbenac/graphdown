---
typeId: "req"
recordId: "API-SESSION-002"
parent: "section:required-session-behavior"
fields:
  title: "Read operations are side-effect free"
  testable: false
  order: 1
---

All Runtime API **read** operations MUST be side-effect free:

* they MUST NOT mutate dataset content,
* they MUST NOT rewrite file bytes,
* and they MUST NOT change derived semantics (relationships, hierarchy, etc.).

---
