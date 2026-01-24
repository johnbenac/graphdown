---
typeId: req
recordId: FR-MD-020
fields:
  title: YAML front matter is required
  order: 0
parent: section:5-markdown-record-file-format
---
Every **type object** and **record object** file MUST start with YAML front matter delimited by:

```md
---
<yaml object>
---
<body markdown>
```

This requirement applies only to files that are discovered as record files per LAYOUT-001.

For avoidance of doubt:
* GraphMD repositories MAY contain other Markdown files with YAML front matter (including invalid YAML).
* Such files are non-semantic unless they are discovered as record files (LAYOUT-001) or plugin manifests (PLUG-LAYOUT-001),
  and MUST NOT cause import failure merely due to invalid or unterminated YAML (LAYOUT-003).
