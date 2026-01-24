---
typeId: req
recordId: CID-004
fields:
  title: Decoded CID exposes raw codec and digest
  order: 5
  testable: true
parent: section:3-2-block-identity
---


Decoding a DASL CIDv1 string produced by `cidFromRawBytes` MUST:

* report codec `raw`, and
* expose the SHA-256 digest of the original bytes.