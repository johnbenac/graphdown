---
typeId: req
recordId: PLUG-FR-003
fields:
  title: Plugin manifest body is raw Markdown
  order: 3
  testable: false
parent: section:5-1-plugin-manifest-file-format
---


The plugin manifest body is everything after the closing `---`.

Core MUST treat the body as an uninterpreted string.
Core MUST NOT extract record relationships from plugin manifest bodies (REL-002 remains record-only).

---