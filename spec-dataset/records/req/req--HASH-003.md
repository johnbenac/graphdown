---
typeId: req
recordId: HASH-003
fields:
  title: Snapshot fingerprint (types + record objects + plugin objects)
  order: 3
parent: section:3-1-dataset-identity-hashes
---


Implementations MUST compute a **snapshot fingerprint** for a dataset.

The snapshot fingerprint is the gdhash-v1 SHA-256 digest computed over:

* all type objects (FR-MD-021),
* all record objects (FR-MD-023), and
* all plugin objects (plugin manifests + plugin bundle files per HASH-001).