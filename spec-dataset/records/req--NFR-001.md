---
typeId: req
recordId: "NFR-001"
parent: "section:ui-requirements"
fields:
  title: "No full reloads for CRUD"
  heading: "CRUD does not perform full document reloads"
  order: 2
  testable: true
---


In the GraphMD web UI, performing CRUD actions MUST NOT trigger a full document navigation/reload.
Specifically, after the initial page load, CRUD actions MUST NOT cause the top-level document `load` event to fire again.
