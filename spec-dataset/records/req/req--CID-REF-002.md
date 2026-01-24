---
typeId: req
recordId: CID-REF-002
fields:
  title: CID reference normalization is strict
  order: 2
  testable: true
parent: section:8-1-block-references
---


When interpreting a CID reference token, core MUST:

* unwrap `[[...]]`
* trim surrounding whitespace
* require the inner text to be a valid DASL CIDv1 string

Tokens that are not CID-shaped MUST be ignored for block reference extraction.

CID-shaped tokens that fail DASL CIDv1 decoding MUST be treated as invalid and MUST fail validation (VAL-CID-001).

---