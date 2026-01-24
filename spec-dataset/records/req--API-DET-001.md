---
typeId: req
recordId: "API-DET-001"
parent: "section:3-determinism-requirements"
fields:
  title: "Read results are deterministic for a fixed snapshot"
  order: 0
  testable: false
---


For a fixed dataset snapshot, all Runtime API read operations MUST return deterministic results, including:

* list ordering,
* Record Link Graph adjacency,
* Record Hierarchy results,
* Type Composition Dependency reads,
* block reference extraction, and
* reachable block set computation.

---
