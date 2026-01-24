---
typeId: req
recordId: PLUG-RES-001
fields:
  title: pluginId and gdApiVersion are reserved top-level keys
  order: 9
  testable: false
parent: section:4-repository-layout-requirements
---


The top-level YAML keys `pluginId` and `gdApiVersion` are reserved for plugin manifests.
Non-record Markdown files that use both keys will be treated as plugin manifest candidates and validated as such.