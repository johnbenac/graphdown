---
typeId: req
recordId: "CID-004"
parent: "section:2-block-identity"
fields:
  title: "Decoded CID exposes raw codec and digest"
  order: 4
  testable: true
---


Decoding a DASL CIDv1 string produced by `cidFromRawBytes` MUST:

* report codec `raw`, and
* expose the SHA-256 digest of the original bytes.
