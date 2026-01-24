---
typeId: req
recordId: NFR-PERSIST-001
fields:
  title: Web persistence requires IndexedDB
  order: 3
  testable: true
parent: section:13-ui-requirements
---
In the GraphMD web UI, persistence of the active dataset MUST use IndexedDB.
If IndexedDB is unavailable or fails, the UI MUST fail with a clear error and MUST NOT fall back to in-memory persistence.
The failure MUST be surfaced to the user and logged to the console.
