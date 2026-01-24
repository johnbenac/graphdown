---
typeId: req
recordId: PLUG-ID-001
fields:
  title: pluginId syntax is separator-safe
  order: 2
  testable: true
  verify: todo
parent: section:plugin-bundle-file
---


`pluginId` MUST be a string and MUST be non-empty after trimming.

`pluginId` MUST match: `^[A-Za-z0-9][A-Za-z0-9_-]*$`

`pluginId` MUST NOT contain `:`.

Colon is reserved elsewhere (e.g. record references) and MUST NOT appear in plugin identifiers.