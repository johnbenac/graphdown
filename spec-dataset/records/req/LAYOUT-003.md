---
typeId: req
recordId: LAYOUT-003
fields:
  title: Malformed YAML front matter in non-semantic Markdown is ignored
  order: 2
  testable: true
parent: section:4-repository-layout-requirements
---
GraphMD repositories MAY contain arbitrary Markdown files that begin with `---` (YAML front matter),
including files whose front matter is unterminated, invalid YAML, or parses to a non-object.

Such files:

* MUST NOT cause import/validation to fail solely due to front matter shape or YAML parsing errors, and
* MUST NOT be treated as record files (LAYOUT-001) or plugin manifest files (PLUG-LAYOUT-001).

Note:
If such a file is included as a plugin bundle file via a valid plugin manifest (PLUG-LAYOUT-002),
it remains a semantic plugin bundle file for hashing/export purposes (HASH-001 / EXP-PLUG-001),
regardless of whether it contains valid YAML front matter.
