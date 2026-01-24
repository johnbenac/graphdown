---
typeId: req
recordId: EXT-001
fields:
  title: Type/record top-level vocabulary is fixed
  order: 1
  testable: true
parent: section:6-reserved-keys-and-extensibility-rules
---


For **type objects and record objects only** (FR-MD-021 / FR-MD-023), the only top-level YAML keys defined by this standard are:

* `typeId`
* `recordId`
* `parent`
* `fields`

All other top-level keys are forbidden on type/record objects.

This requirement does not apply to plugin manifest objects, which have their own top-level vocabulary (PLUG-FR-002).