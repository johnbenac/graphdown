---
typeId: "req"
recordId: "VAL-COMP-002"
parent: "section:9-import-time-validity-and-integrity-rules"
fields:
  title: "Required components must be satisfied by outgoing record links"
  order: 6
---

When a type object defines `fields.composition`, then for every record object of that `typeId`:

For each component where `required: true`, the record MUST contain at least one outgoing relationship link (REL-001/REL-002/REL-003) to an existing record object whose `typeId` equals the component `typeId`.

Links that do not resolve to an existing record object do not satisfy composition.
