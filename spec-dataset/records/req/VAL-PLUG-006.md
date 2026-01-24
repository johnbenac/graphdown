---
typeId: req
recordId: VAL-PLUG-006
fields:
  title: Plugin bundle must not contain reserved export paths
  order: 5
  testable: true
  verify: todo
parent: section:9-4-plugin-validity-and-integrity-rules
---
For each plugin manifest:

* The `files[]` list MUST NOT contain the exact string `manifest.md`.

Rationale:
The canonical export path for the plugin manifest is `plugins/<pluginId>/manifest.md` (EXP-PLUG-001). Allowing a bundle file named `manifest.md` would create a path collision in canonical export.

Validation MUST fail with error code `E_PLUGIN_PATH_RESERVED`.
