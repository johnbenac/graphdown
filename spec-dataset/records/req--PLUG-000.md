---
typeId: req
recordId: "PLUG-000"
parent: "section:repository-layout-requirements"
fields:
  title: "Plugins are a first-class dataset object class"
  order: 6
  testable: true
  verify: "ci"
---


GraphMD defines **plugin objects** as a first-class semantic object class in the dataset repository.

A dataset MAY contain zero or more plugin objects.
A dataset MUST remain valid and usable without any plugins present.

When plugin objects are present, they:

* MUST be validated at import time (§9.4),
* MUST participate in dataset hashing (HASH-003),
* MUST be included in canonical dataset export (EXP-003 / EXP-PLUG-001).
