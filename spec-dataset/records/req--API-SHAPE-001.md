---
typeId: req
recordId: "API-SHAPE-001"
parent: "section:runtime-api"
fields:
  title: "Type object view shape"
  order: 13
  testable: false
---


When the Runtime API returns a type object as structured data, it MUST provide at least:

* `typeId: string`
* `fields: object/map`
* `body: string`

The `fields` map MUST preserve user-authored content as opaque data (EXT-002 / TYPE-004 / NR-SEM-001).

---
