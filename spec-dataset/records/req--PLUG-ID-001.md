---
typeId: req
recordId: "PLUG-ID-001"
parent: "section:terminology"
fields:
  title: "pluginId syntax is separator-safe"
  order: 20
  testable: true
  verify: "todo"
---


`pluginId` MUST be a string and MUST be non-empty after trimming.

`pluginId` MUST match: `^[A-Za-z0-9][A-Za-z0-9_-]*$`

`pluginId` MUST NOT contain `:`.

Colon is reserved elsewhere (e.g. record references) and MUST NOT appear in plugin identifiers.
