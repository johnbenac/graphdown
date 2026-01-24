---
typeId: req
recordId: FR-MD-023
fields:
  title: Required top-level keys for record objects
  order: 3
  testable: true
parent: section:5-markdown-record-file-format
---


A YAML front matter object is a **record object** when it defines:

* `typeId` (string; MUST satisfy ID-001)
* `recordId` (string; MUST satisfy ID-001)
* `fields` (object/map)
* `parent` (optional; when present MUST satisfy HIER-001)

A record object MUST NOT define any other top-level keys.