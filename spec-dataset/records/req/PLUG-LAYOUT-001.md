---
typeId: "req"
recordId: "PLUG-LAYOUT-001"
parent: "section:4-repository-layout-requirements"
fields:
  title: "Plugin manifests are discovered by content (not path)"
  testable: true
  verify: "todo"
  order: 7
---

A **plugin manifest file** is any file that:

* ends in `.md`,
* begins with YAML front matter at byte 0 (same delimiter rules as FR-MD-020),
* whose parsed YAML value is an object/map, and
* whose YAML object contains **both** keys:
  * `pluginId`, and
  * `gdApiVersion`.

Plugin manifest discovery MUST NOT depend on directory names or specific paths.

A file that satisfies LAYOUT-001 is a record file, not a plugin manifest file:
* If a file contains `typeId` and satisfies LAYOUT-001, it MUST be treated as a record file and MUST NOT be treated as a plugin manifest file.

Files that begin with `---` but have unterminated front matter, invalid YAML, or YAML that parses to a non-object
MUST NOT be treated as plugin manifest files and MUST NOT cause import failure solely due to YAML parsing errors (LAYOUT-003).

Notes:
* Discovery is intentionally broader than PLUG-FR-002 so that malformed manifests are not silently ignored; they are discovered and then rejected by validation (VAL-PLUG-001).
* Discovery MUST NOT depend on the numeric value of `gdApiVersion`.
