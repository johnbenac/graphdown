---
typeId: req
recordId: VAL-PLUG-005
fields:
  title: Plugin bundle file encoding modes are validated
  order: 4
  testable: true
  verify: todo
parent: section:9-4-plugin-validity-and-integrity-rules
---
* `binaryFiles` MAY be omitted; if omitted, it is treated as an empty list.
* If present:
  * `binaryFiles` MUST be an array.
  * Every element MUST be a string.
  * Every element MUST satisfy PLUG-LAYOUT-003 path safety rules.
  * Every element MUST appear in `files[]` by exact string equality.
* For each bundle file in `files[]`:
  * If the path is not in `binaryFiles[]`, the file MUST be UTF-8 decodable.
  * If the path is in `binaryFiles[]`, the file MAY be any bytes.

Validation MUST fail otherwise.

Note:
Binary assets MAY be shipped as plugin bundle files. Large assets SHOULD be stored as blocks when beneficial.
