---
typeId: req
recordId: "REL-003"
parent: "section:relationships-and-linking"
fields:
  title: "Record reference normalization"
  order: 2
  testable: true
---


When interpreting a wiki-link token, core MUST:

* unwrap `[[...]]`
* trim surrounding whitespace
* require the inner text to match `typeId:recordId` where both parts satisfy ID-001

Tokens that do not match this shape MUST be ignored for relationship extraction.
