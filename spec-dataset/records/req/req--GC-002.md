---
typeId: req
recordId: GC-002
fields:
  title: Unreferenced blocks are garbage and are excluded from canonical dataset
    export
  order: 2
  testable: true
parent: section:9-1-block-garbage-collection
---


A block store file is garbage if its `<cid>` is not in the reachable block set (GC-001), including plugin-declared block dependencies.

The canonical dataset export (EXP-003) MUST NOT include garbage block files.