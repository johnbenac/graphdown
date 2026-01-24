---
typeId: "req"
recordId: "HASH-004"
parent: "section:3-1-dataset-identity-hashes"
fields:
  title: "Only schema and snapshot fingerprints are defined in core"
  testable: true
  order: 3
---

GraphMD core defines exactly two standardized dataset fingerprint computations:

* schema fingerprint (HASH-002)
* snapshot fingerprint (HASH-003)

Core MUST NOT define or expose any additional standardized fingerprint computation.

If the core hashing API accepts a `scope` selector, it MUST accept only `schema` and `snapshot`.
Any other value MUST fail with error code `E_USAGE` and MUST NOT return a digest.
