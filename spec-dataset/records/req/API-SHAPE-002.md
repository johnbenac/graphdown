---
typeId: "req"
recordId: "API-SHAPE-002"
parent: "section:required-returned-object-shapes"
fields:
  title: "Record object view shape"
  testable: false
  order: 1
---

When the Runtime API returns a record object as structured data, it MUST provide at least:

* `typeId: string`
* `recordId: string`
* `recordKey: string` equal to `typeId:recordId` (computed)
* `fields: object/map`
* `body: string`
* `parent: string | null | undefined` reflecting HIER-001

Core MUST treat `recordKey` as computed and MUST NOT persist it as a YAML field (§3).

---
