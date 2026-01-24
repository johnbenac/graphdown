---
typeId: "req"
recordId: "IMP-PLUG-001"
parent: "section:11-import-from-github-requirements"
fields:
  title: "Importers must include plugin manifests and bundles"
  testable: true
  verify: "todo"
  order: 5
---

When importing a dataset snapshot, implementations MUST include:

* all discovered plugin manifest files (PLUG-LAYOUT-001), and
* all plugin bundle files resolved from those manifests (PLUG-LAYOUT-002),

in the in-memory dataset snapshot used for validation, hashing, and export.

Importers MUST NOT drop plugin bundle files as “ignored non-dataset files”.

---
