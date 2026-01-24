---
typeId: req
recordId: "VAL-005"
parent: "section:import-time-validity-and-integrity-rules"
fields:
  title: "Required fields (schema-driven)"
  order: 3
---


When a type object defines `fields.fieldDefs`, then for every field definition where `required: true`:

* every record object of that `typeId` MUST contain `fields.<fieldName>` with a value that is not:

  * missing,
  * null,
  * or an all-whitespace string.

(For arrays/objects, “empty” is not defined as invalid by core; only missing/null/blank-string is.)
