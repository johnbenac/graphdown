---
typeId: req
recordId: "HASH-002"
parent: "section:1-dataset-identity-hashes"
fields:
  title: "Schema fingerprint (types only)"
  order: 1
---


Implementations MUST compute a **schema fingerprint** for a dataset.

The schema fingerprint is the gdhash-v1 SHA-256 digest computed over **all type objects** (FR-MD-021), and over no other files.
