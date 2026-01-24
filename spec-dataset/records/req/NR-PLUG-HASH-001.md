---
typeId: "req"
recordId: "NR-PLUG-HASH-001"
parent: "section:2-explicit-non-requirements"
fields:
  title: "Plugins do not define hashing semantics"
  testable: true
  verify: "ci"
  order: 8
---

Dataset hashing (gdhash-v1) is defined by core (HASH-001/002/003).
Plugins MUST NOT modify hashing inputs, normalization rules, identity strings, or ordering rules.

---
