---
typeId: req
recordId: PLUG-UTIL-001
fields:
  title: Core exposes deterministic plugin object discovery
  order: 3
  testable: true
parent: section:14-plugin-and-extensibility-requirements
---


GraphMD core MUST provide a deterministic helper for enumerating plugin objects from a DatasetSnapshot.

Given a DatasetSnapshot, the helper MUST:

1. Discover plugin manifest files per PLUG-LAYOUT-001.
2. Parse each discovered manifest as a Markdown record with YAML front matter (PLUG-FR-001), returning:
   * `file` (dataset-relative manifest path),
   * `yaml` (front matter object),
   * `body` (raw Markdown body).
3. When `yaml.files` is present as an array of strings, resolve bundle file paths per PLUG-LAYOUT-002 and return:
   * a mapping from each declared relative path to its resolved dataset-relative path, and
   * the union set of all resolved bundle file paths.

The returned plugin manifest list MUST be deterministic and MUST be sorted lexicographically by manifest file path.

This helper exists to ensure all core subsystems share identical plugin discovery and bundle path resolution logic, reducing drift risk while preserving plugin non-requirements.

---