---
typeId: req
recordId: "API-BLOCK-WRITE-003"
parent: "section:p-2-block-writes-and-garbage-collection"
fields:
  title: "Block deletion is constrained by validity"
  order: 2
  testable: false
---


If the Runtime API declares capability `gd.api.blocks.delete`, it MAY provide a block deletion operation.

Deleting a block that is still referenced by any record MUST cause validation failure (VAL-BLOCK-001) and MUST NOT commit.

Deleting an unreferenced (garbage) block MAY succeed.

---
