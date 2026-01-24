---
typeId: "section"
recordId: "12-export-requirements"
parent: "spec:graphmd-standard-v0-5"
fields:
  title: "12. Export requirements"
  level: 2
  order: 21
---

Export produces dataset snapshots as files (not a JSON/database dump). GraphMD record files remain
Markdown with YAML front matter per §5 and are intended to be tracked in version control.

GraphMD defines a single standardized export: the **canonical dataset zip**.
Exporting arbitrary non-record, non-plugin files from an imported repository snapshot (for example `docs/`, `assets/`, `.git/`) is not required by this standard.
