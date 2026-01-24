---
typeId: "req"
recordId: "PLUG-FR-003"
parent: "section:5-1-plugin-manifest-file-format"
fields:
  title: "Plugin manifest body is raw Markdown"
  testable: false
  order: 2
---

The plugin manifest body is everything after the closing `---`.

Core MUST treat the body as an uninterpreted string.
Core MUST NOT extract record relationships from plugin manifest bodies (REL-002 remains record-only).

---
