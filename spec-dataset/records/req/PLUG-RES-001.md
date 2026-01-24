---
typeId: "req"
recordId: "PLUG-RES-001"
parent: "section:4-repository-layout-requirements"
fields:
  title: "pluginId and gdApiVersion are reserved top-level keys"
  testable: false
  order: 8
---

The top-level YAML keys `pluginId` and `gdApiVersion` are reserved for plugin manifests.
Non-record Markdown files that use both keys will be treated as plugin manifest candidates and validated as such.
