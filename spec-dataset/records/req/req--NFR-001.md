---
typeId: req
recordId: NFR-001
fields:
  title: CRUD does not perform full document reloads
  order: 3
  testable: true
parent: section:13-ui-requirements
---


In the GraphMD web UI, performing CRUD actions MUST NOT trigger a full document navigation/reload.
Specifically, after the initial page load, CRUD actions MUST NOT cause the top-level document `load` event to fire again.