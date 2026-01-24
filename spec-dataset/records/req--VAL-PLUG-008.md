---
typeId: req
recordId: "VAL-PLUG-008"
parent: "section:4-plugin-validity-and-integrity-rules"
fields:
  title: "Plugin-declared block dependencies must resolve to matching block bytes"
  order: 7
  testable: true
  verify: "todo"
---


For every CID listed in any plugin manifest `blocks[]`:

1. A corresponding block file MUST exist at the canonical block store path derived from the CID (BLOCK-LAYOUT-001).
2. The block file’s computed digest (BLOCK-001) MUST equal the digest embedded in the CID exactly.

Validation MUST fail otherwise with error code `E_PLUGIN_BLOCK_MISSING_OR_INVALID`.
