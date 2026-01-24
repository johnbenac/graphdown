---
typeId: req
recordId: VAL-002
fields:
  title: Identity uniqueness rules
  order: 2
  testable: true
parent: section:9-import-time-validity-and-integrity-rules
---


Type identity:
* `typeId` values across type objects MUST be unique (TYPE-002).

Record identity:
* For record objects, the pair `(typeId, recordId)` MUST be unique across the dataset.

`recordId` alone is not required to be unique globally.