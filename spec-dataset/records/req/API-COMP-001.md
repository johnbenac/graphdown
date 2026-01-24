---
typeId: req
recordId: API-COMP-001
fields:
  title: Type Composition Dependencies are readable
  order: 2
  commentGap: 1
  testable: false
parent: section:16-1-read-access-to-derived-structures
---
The Runtime API MUST provide read access to **Type Composition Dependencies** derived from `fields.composition` (TYPE-COMP-001), including at minimum:

* retrieval of the declared composition map for a given `typeId` (when present)
* identification of which component edges are `required: true`

The Runtime API MUST NOT infer composition dependencies from record relationships or hierarchy.

---
