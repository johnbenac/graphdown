---
typeId: req
recordId: "PLUG-RES-001"
parent: "section:repository-layout-requirements"
fields:
  title: "pluginId and gdApiVersion are reserved top-level keys"
  order: 8
  testable: false
---


The top-level YAML keys `pluginId` and `gdApiVersion` are reserved for plugin manifests.
Non-record Markdown files that use both keys will be treated as plugin manifest candidates and validated as such.
