---
typeId: req
recordId: PLUG-LAYOUT-003
fields:
  title: Plugin bundle file paths are safe and self-contained
  order: 11
  testable: true
  verify: todo
parent: section:4-repository-layout-requirements
---


Each plugin manifest `files[]` entry and the manifest `entry` value MUST be a canonical safe relative path.

A canonical safe relative path is a string `p` that satisfies all of the following:

* MUST be a string and MUST be non-empty after trimming.
* MUST equal its trimmed value (no leading or trailing whitespace).
* MUST NOT be absolute (MUST NOT start with `/`).
* MUST NOT start with `./`.
* MUST NOT contain `\0`.
* MUST use `/` as the separator (backslashes `\` are forbidden).
* MUST NOT contain empty path segments.
  * This forbids `//`, forbids a trailing `/`, and forbids a leading `/` (already forbidden above).
* MUST NOT contain `.` path segments.
* MUST NOT contain `..` path segments.

A plugin’s bundle MUST be self-contained:

* For a manifest at path `M`, each resolved bundle file path `resolve(M,p)` (PLUG-LAYOUT-002) MUST be located under `manifestDir(M)`.
  * When `manifestDir(M) == ""` (root manifest), all dataset-relative paths are under the manifest directory by definition.
  * When `manifestDir(M) != ""`, `resolve(M,p)` MUST start with `manifestDir(M) + "/"`.

Violation of any rule in this requirement MUST fail validation (VAL-PLUG-004).

---