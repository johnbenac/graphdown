---
typeId: req
recordId: LAYOUT-002
fields:
  title: One object per file
  order: 1
  testable: true
parent: section:4-repository-layout-requirements
---
Each record file MUST contain exactly one YAML front matter block at the start of the file (per FR-MD-020). The remainder of the file is the record body (FR-MD-022).

Core MUST NOT support multiple record objects in a single file.
