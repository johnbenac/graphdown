---
typeId: req
recordId: VAL-PLUG-007
fields:
  title: Plugin-declared block dependencies must be valid CIDs
  order: 7
  testable: true
  verify: todo
parent: section:9-4-plugin-validity-and-integrity-rules
---


If a plugin manifest defines `blocks`, then:

* `blocks` MUST be an array.
* Every element of `blocks` MUST be a string.
* Every element MUST decode as a valid DASL CIDv1 string.

Validation MUST fail otherwise with error code `E_PLUGIN_BLOCK_CID_INVALID`.