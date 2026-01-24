---
typeId: req
recordId: "TYPE-004"
parent: "section:types-and-schema-as-data"
fields:
  title: "fieldDefs shape"
  order: 2
  testable: true
---


A type object is valid with or without `fields.fieldDefs`.

When present, `fields.fieldDefs` MUST be a map keyed by field name. Each field definition value MUST be an object.

Core recognizes exactly one standard key inside a field definition object:

* `required` (boolean)

All other keys inside field definition objects are allowed and MUST be treated as opaque by core.
