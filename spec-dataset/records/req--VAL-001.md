---
typeId: req
recordId: "VAL-001"
parent: "section:import-time-validity-and-integrity-rules"
fields:
  title: "Type/records/plugins/blocks must be internally consistent"
  order: 0
---


Import MUST fail if:

* any record file fails record format requirements (§5)
* any type object fails type requirements (§7)
* any plugin manifest, plugin bundle, or plugin-declared block dependency fails plugin requirements (§5.1 / §9.4)
* identity uniqueness fails (§9.2 and PLUG-ID-002)
* a record object’s `typeId` has no matching type object (§9.3)
* any record hierarchy `parent` pointer is invalid, unresolved, or cyclic (VAL-PARENT-001/VAL-PARENT-002/VAL-PARENT-003)
* any block store file fails block integrity requirements (§VAL-BLOCK-002)
* any record-declared block reference fails resolution (§VAL-BLOCK-001)
