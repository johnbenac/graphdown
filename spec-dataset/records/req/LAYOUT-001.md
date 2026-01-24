---
typeId: req
recordId: LAYOUT-001
fields:
  title: Record files are discovered by content (not path)
  order: 0
  testable: true
parent: section:4-repository-layout-requirements
---
A **record file** is any file that:

* ends in `.md`, and
* begins with a YAML front matter delimiter at byte 0 (the first three bytes are `---` followed by a line break), and
* contains a closing YAML front matter delimiter `---`, and
* whose front matter YAML parses successfully to an object/map, and
* whose parsed YAML object contains a `typeId` key.

If a `.md` file begins with `---` but:

* the closing delimiter is missing,
* YAML parsing fails, or
* YAML parses to a non-object,

then the file MUST NOT be treated as a record file and MUST be ignored per LAYOUT-003 and BLOCK-LAYOUT-003.

Files that do not meet the record file conditions are ignored by core for record discovery.
Paths and directory names carry no semantic meaning and MUST NOT affect validity, identity, or hashing.
