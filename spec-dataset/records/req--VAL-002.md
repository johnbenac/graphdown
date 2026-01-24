---
typeId: req
recordId: "VAL-002"
parent: "section:import-time-validity-and-integrity-rules"
fields:
  title: "Identity uniqueness rules"
  order: 1
  testable: true
---


Type identity:
* `typeId` values across type objects MUST be unique (TYPE-002).

Record identity:
* For record objects, the pair `(typeId, recordId)` MUST be unique across the dataset.

`recordId` alone is not required to be unique globally.
