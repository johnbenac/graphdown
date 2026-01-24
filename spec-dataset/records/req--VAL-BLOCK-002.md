---
typeId: req
recordId: "VAL-BLOCK-002"
parent: "section:4-plugin-validity-and-integrity-rules"
fields:
  title: "Block store files must match their CID digest"
  order: 10
  testable: true
---


For every file under `blocks/sha2-256/<p>/<cid>`:

The computed digest of the file bytes (BLOCK-001) MUST equal the digest embedded in `<cid>`.

Validation MUST fail otherwise.
