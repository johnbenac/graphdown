---
typeId: req
recordId: API-SESSION-001
fields:
  title: Runtime API can open a session from a snapshot
  order: 1
  testable: false
parent: section:required-session-behavior
---


The Runtime API MUST support opening a session from a snapshot-equivalent file map (DatasetSnapshot semantics).

Opening a session MUST:

* discover record files by content (LAYOUT-001),
* validate the dataset per VAL-001, and
* fail if validation fails.

---