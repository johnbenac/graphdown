---
typeId: req
recordId: IMP-PLUG-001
fields:
  title: Importers must include plugin manifests and bundles
  order: 6
  testable: true
  verify: todo
parent: section:11-import-from-github-requirements
---


When importing a dataset snapshot, implementations MUST include:

* all discovered plugin manifest files (PLUG-LAYOUT-001), and
* all plugin bundle files resolved from those manifests (PLUG-LAYOUT-002),

in the in-memory dataset snapshot used for validation, hashing, and export.

Importers MUST NOT drop plugin bundle files as “ignored non-dataset files”.

---