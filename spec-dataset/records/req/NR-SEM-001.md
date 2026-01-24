---
typeId: "req"
recordId: "NR-SEM-001"
parent: "section:2-explicit-non-requirements"
fields:
  title: "No semantic validation of fields"
  testable: true
  order: 2
---

Core validation MUST NOT reject records based on semantic interpretation of `fields` values (e.g. enforcing booleans, dates, money objects, enums, or format constraints), regardless of any metadata present in type objects (including keys inside `fields.fieldDefs`).

If you want those semantics, that’s plugin territory (or dataset-author tooling), not core.
