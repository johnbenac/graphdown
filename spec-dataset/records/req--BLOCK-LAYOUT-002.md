---
typeId: req
recordId: "BLOCK-LAYOUT-002"
parent: "section:repository-layout-requirements"
fields:
  title: "Only canonical block files are allowed in the block store"
  order: 4
  testable: true
---


Any file located under `blocks/` MUST match the canonical block store path rules in BLOCK-LAYOUT-001.

Validation MUST fail if any file exists under `blocks/` that does not match the required `blocks/sha2-256/<p>/<cid>` shape.

No other directories or files under `blocks/` are allowed.
