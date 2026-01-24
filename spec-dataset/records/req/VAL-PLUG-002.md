---
typeId: "req"
recordId: "VAL-PLUG-002"
parent: "section:9-4-plugin-validity-and-integrity-rules"
fields:
  title: "pluginId must be unique"
  testable: true
  verify: "todo"
  order: 1
---

If two plugin manifests declare the same `pluginId`, validation MUST fail.

Validation failure MUST include stable error code `E_PLUGIN_DUPLICATE_ID` and should attribute both manifest file paths when possible.
