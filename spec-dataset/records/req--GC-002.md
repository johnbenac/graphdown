---
typeId: req
recordId: "GC-002"
parent: "section:1-block-garbage-collection"
fields:
  title: "Unreferenced blocks are garbage and are excluded from canonical dataset export"
  order: 1
  testable: true
---


A block store file is garbage if its `<cid>` is not in the reachable block set (GC-001), including plugin-declared block dependencies.

The canonical dataset export (EXP-003) MUST NOT include garbage block files.
