---
typeId: req
recordId: "API-EXP-001"
parent: "section:p-3-hashing-and-export-apis"
fields:
  title: "API can produce canonical dataset export bytes"
  order: 1
  testable: false
---


If the Runtime API declares capability `gd.api.export`, it MUST provide an operation to produce the canonical dataset export (EXP-003) as zip bytes.

The export MUST:

* include all type objects and record objects,
* include all plugin objects (plugin manifests + plugin bundle files),
* include all reachable blocks at canonical paths,
* exclude non-record, non-plugin, non-block-store files,
* preserve record content bytes except where explicitly edited (EXP-005).

---
