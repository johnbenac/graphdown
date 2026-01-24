---
typeId: "req"
recordId: "VAL-PLUG-001"
parent: "section:9-4-plugin-validity-and-integrity-rules"
fields:
  title: "Plugin manifests must parse and satisfy PLUG-FR-002"
  testable: true
  verify: "todo"
  order: 0
---

Validation MUST fail if any discovered plugin manifest file:

* fails PLUG-FR-001 front matter parsing, or
* fails PLUG-FR-002 key and type constraints.

Validation failures MUST include the manifest file path and a stable error code.

Recommended error codes:
* `E_PLUGIN_MANIFEST_INVALID`
* `E_PLUGIN_KEYS_INVALID`
