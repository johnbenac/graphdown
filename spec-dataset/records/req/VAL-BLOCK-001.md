---
typeId: req
recordId: VAL-BLOCK-001
fields:
  title: Block references must resolve to matching block bytes
  order: 9
  testable: true
parent: section:9-4-plugin-validity-and-integrity-rules
---
For every block reference extracted per CID-REF-001/CID-REF-002 (from record or type objects):

1. A corresponding block file MUST exist at the canonical block store path derived from the referenced `<cid>` (BLOCK-LAYOUT-001).
2. The block file’s computed digest (BLOCK-001) MUST equal the digest embedded in `<cid>` exactly.

Validation MUST fail otherwise.
