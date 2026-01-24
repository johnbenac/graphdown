---
typeId: "req"
recordId: "TYPE-COMP-001"
parent: "section:7-types-and-schema-as-data"
fields:
  title: "composition shape"
  testable: true
  order: 3
---

A type object is valid with or without `fields.composition`.

When present, `fields.composition` MUST be a map keyed by component name.
Each component value MUST be an object that defines:

* `typeId` (string; MUST satisfy ID-001)
* `required` (boolean)

All other keys inside component objects are forbidden.

---
