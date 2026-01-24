---
typeId: "req"
recordId: "VAL-PLUG-004"
parent: "section:9-4-plugin-validity-and-integrity-rules"
fields:
  title: "Plugin bundle file paths must resolve safely and exist"
  testable: true
  verify: "todo"
  order: 3
---

For each plugin manifest at path `M` and each declared file `p` in `files[]`:

* `p` MUST satisfy PLUG-LAYOUT-003 path safety rules.
* `resolve(M, p)` MUST exist as a file in the dataset snapshot.
* `resolve(M, p)` MUST NOT be:
  * a record file (LAYOUT-001), or
  * a block store file (BLOCK-LAYOUT-001), or
  * a plugin manifest file (PLUG-LAYOUT-001).

Additionally, for each plugin manifest:

* `files[]` entries MUST be unique by exact string equality.
* The set `{ resolve(M, p) | p in files[] }` MUST be unique (no collisions).

Validation MUST fail otherwise. Duplicate `files[]` entries or resolved path collisions MUST use error code `E_PLUGIN_FILES_DUPLICATE`.

Recommended error codes:
* `E_PLUGIN_PATH_INVALID`
* `E_PLUGIN_FILE_MISSING`
* `E_PLUGIN_FILE_KIND_FORBIDDEN`
* `E_PLUGIN_FILES_DUPLICATE`
