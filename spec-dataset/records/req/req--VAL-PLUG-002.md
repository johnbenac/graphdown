---
typeId: req
recordId: VAL-PLUG-002
fields:
  title: pluginId must be unique
  order: 2
  testable: true
  verify: todo
parent: section:9-4-plugin-validity-and-integrity-rules
---


If two plugin manifests declare the same `pluginId`, validation MUST fail.

Validation failure MUST include stable error code `E_PLUGIN_DUPLICATE_ID` and should attribute both manifest file paths when possible.