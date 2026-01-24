---
typeId: req
recordId: GC-001
fields:
  title: Reachable block set is computed from declared block dependencies
  order: 1
  testable: true
parent: section:9-1-block-garbage-collection
---


The reachable block set is defined as the union of:

1. All `<cid>` values referenced by block references extracted from all record and type objects per CID-REF-001/CID-REF-002, and
2. All `<cid>` values listed in any plugin manifest `blocks[]` list (PLUG-FR-002 / VAL-PLUG-007).

Implementations MUST be able to compute this reachable set deterministically.