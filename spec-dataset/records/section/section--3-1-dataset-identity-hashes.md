---
typeId: section
recordId: 3-1-dataset-identity-hashes
fields:
  title: 3.1 Dataset identity hashes
  order: 7
  level: 2
parent: spec:graphmd-standard-v0-5
---


A Dataset’s identity is computed from its semantic files, not from any human-managed dataset record.
This standard defines two computed identity values:

* **Schema fingerprint**: based on type objects only
* **Snapshot fingerprint**: based on type objects + record objects + plugin objects

No “records-only” fingerprint is defined in core.