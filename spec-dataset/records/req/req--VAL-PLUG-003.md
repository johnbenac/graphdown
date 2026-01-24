---
typeId: req
recordId: VAL-PLUG-003
fields:
  title: Plugin entry must exist and be included
  order: 3
  testable: true
  verify: todo
parent: section:9-4-plugin-validity-and-integrity-rules
---


For each plugin manifest:

* `entry` MUST be a non-empty string after trimming.
* `entry` MUST satisfy PLUG-LAYOUT-003 (canonical safe relative path).
* `entry` MUST appear as an element of `files` by exact string equality.

Validation MUST fail otherwise with error code `E_PLUGIN_ENTRY_INVALID`.