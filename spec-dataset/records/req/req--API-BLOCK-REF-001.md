---
typeId: req
recordId: API-BLOCK-REF-001
fields:
  title: List block references extracted from a record
  order: 5
  testable: false
parent: section:16-2-block-object-read-api
---


The Runtime API MUST provide a method that returns the set/list of block CIDs referenced from a given record, extracted per CID-REF-001/CID-REF-002 from:

* the record body, and
* any string value anywhere within record `fields` (nested arrays/objects included)

Returned CID lists MUST be deterministic and SHOULD be sorted lexicographically by CID.

---