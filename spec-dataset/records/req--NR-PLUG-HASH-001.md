---
typeId: req
recordId: "NR-PLUG-HASH-001"
parent: "section:explicit-non-requirements"
fields:
  title: "Plugins do not define hashing semantics"
  order: 8
  testable: true
  verify: "ci"
---


Dataset hashing (gdhash-v1) is defined by core (HASH-001/002/003).
Plugins MUST NOT modify hashing inputs, normalization rules, identity strings, or ordering rules.

---
