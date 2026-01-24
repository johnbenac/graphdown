---
typeId: req
recordId: HIER-001
fields:
  title: Record hierarchy uses explicit parent pointers
  order: 0
  testable: true
parent: section:8-2-record-hierarchy-parent-pointers
---
Record objects MAY define an optional top-level key `parent`.

`parent` semantics:
* If `parent` is **missing**, the record is a hierarchy root.
* If `parent` is explicitly **null**, the record is a hierarchy root.
* Otherwise, `parent` MUST be a string equal to a record reference `typeId:recordId` where both parts satisfy ID-001.

Hierarchy semantics:
* The hierarchy edge is directed from the record (child) to its `parent` (parent).
* Each record has at most one parent (because `parent` is a single scalar), and datasets MAY contain multiple hierarchy roots.
* The hierarchy is **structural** and MUST NOT be inferred from wiki-links or any other conventions. Only the `parent` key defines hierarchy.

`parent` MUST NOT be interpreted as a relationship link under REL-001/REL-002. Wiki-link relationships remain independent.

---
