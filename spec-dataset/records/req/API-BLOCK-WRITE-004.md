---
typeId: "req"
recordId: "API-BLOCK-WRITE-004"
parent: "section:16p-2-block-writes-and-garbage-collection"
fields:
  title: "Garbage collection mutation removes only garbage blocks"
  testable: false
  order: 3
---

If the Runtime API declares capability `gd.api.blocks.gc`, it MAY provide a garbage collection mutation that removes only garbage blocks (GC-002) and MUST NOT remove reachable blocks (GC-001).

Garbage collection MUST be deterministic and idempotent for a fixed snapshot.

---
