---
typeId: req
recordId: BLOCK-LAYOUT-003
fields:
  title: Non-record, non-block-store, non-plugin files are non-semantic
  order: 5
  testable: true
parent: section:4-repository-layout-requirements
---
Files that are not:

* record files (LAYOUT-001), and not
* block store files (BLOCK-LAYOUT-001), and not
* plugin manifest files or plugin bundle files (PLUG-LAYOUT-001 / PLUG-LAYOUT-002)

MUST be ignored by core for identity, linking, validation semantics, and export inclusion.

Path names and directory names carry no semantic meaning for these ignored files.
