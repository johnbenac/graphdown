---
typeId: req
recordId: FR-MD-021
fields:
  title: Required top-level keys for type objects
  order: 2
  testable: true
parent: section:5-markdown-record-file-format
---


A YAML front matter object is a **type object** when it defines:

* `typeId` (string; MUST satisfy ID-001)
* `fields` (object/map)

A type object MUST NOT define `recordId`.

A type object MUST NOT define `parent`.

A type object MUST NOT define any other top-level keys.