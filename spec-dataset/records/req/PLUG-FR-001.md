---
typeId: req
recordId: PLUG-FR-001
fields:
  title: Plugin manifest YAML front matter is required
  order: 0
  testable: true
  verify: ci
parent: section:5-1-plugin-manifest-file-format
---
Every plugin manifest file MUST start with YAML front matter delimited by:

```md
---
<yaml object>
---
<body markdown>
```

This requirement applies only to files discovered as plugin manifest files per PLUG-LAYOUT-001.

Non-semantic Markdown files (including those with invalid or unterminated YAML front matter) MUST NOT cause import failure (LAYOUT-003).

The plugin manifest body is optional and treated as uninterpreted Markdown text (PLUG-FR-003).
