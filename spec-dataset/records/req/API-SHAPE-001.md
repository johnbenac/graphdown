---
typeId: req
recordId: API-SHAPE-001
fields:
  title: Type object view shape
  order: 0
  commentGap: 1
  testable: false
parent: section:required-returned-object-shapes
---
When the Runtime API returns a type object as structured data, it MUST provide at least:

* `typeId: string`
* `fields: object/map`
* `body: string`

The `fields` map MUST preserve user-authored content as opaque data (EXT-002 / TYPE-004 / NR-SEM-001).

---
