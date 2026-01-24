---
typeId: "req"
recordId: "PLUG-ID-001"
parent: "section:plugin-bundle-file"
fields:
  title: "pluginId syntax is separator-safe"
  testable: true
  verify: "todo"
  order: 1
---

`pluginId` MUST be a string and MUST be non-empty after trimming.

`pluginId` MUST match: `^[A-Za-z0-9][A-Za-z0-9_-]*$`

`pluginId` MUST NOT contain `:`.

Colon is reserved elsewhere (e.g. record references) and MUST NOT appear in plugin identifiers.
