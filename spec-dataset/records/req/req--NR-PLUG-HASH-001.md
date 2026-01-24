---
typeId: req
recordId: NR-PLUG-HASH-001
fields:
  title: Plugins do not define hashing semantics
  order: 9
  testable: true
  verify: ci
parent: section:2-explicit-non-requirements
---


Dataset hashing (gdhash-v1) is defined by core (HASH-001/002/003).
Plugins MUST NOT modify hashing inputs, normalization rules, identity strings, or ordering rules.

---