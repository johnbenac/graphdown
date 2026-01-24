---
typeId: req
recordId: "API-SESSION-002"
parent: "section:runtime-api"
fields:
  title: "Read operations are side-effect free"
  order: 11
  testable: false
---


All Runtime API **read** operations MUST be side-effect free:

* they MUST NOT mutate dataset content,
* they MUST NOT rewrite file bytes,
* and they MUST NOT change derived semantics (relationships, hierarchy, etc.).

---
