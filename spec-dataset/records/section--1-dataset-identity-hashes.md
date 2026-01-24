---
typeId: section
recordId: "1-dataset-identity-hashes"
parent: "spec:graphmd-standard-v0-5"
fields:
  title: "3.1 Dataset identity hashes"
  order: 6
  level: 2
---


A Dataset’s identity is computed from its semantic files, not from any human-managed dataset record.
This standard defines two computed identity values:

* **Schema fingerprint**: based on type objects only
* **Snapshot fingerprint**: based on type objects + record objects + plugin objects

No “records-only” fingerprint is defined in core.
