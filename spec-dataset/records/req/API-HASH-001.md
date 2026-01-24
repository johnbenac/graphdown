---
typeId: "req"
recordId: "API-HASH-001"
parent: "section:16p-3-hashing-and-export-apis"
fields:
  title: "API exposes schema and snapshot fingerprints only"
  testable: false
  order: 0
---

If the Runtime API declares capability `gd.api.hash`, it MUST expose operations to compute:

* schema fingerprint (HASH-002)
* snapshot fingerprint (HASH-003)

The API MUST NOT expose any additional standardized fingerprint computation (HASH-004).

---
