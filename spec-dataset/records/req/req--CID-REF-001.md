---
typeId: req
recordId: CID-REF-001
fields:
  title: Block references use CID wiki-link tokens
  order: 1
  testable: true
parent: section:8-1-block-references
---


A block reference is expressed only as a wiki-link token:

`[[<cid>]]`

Where `<cid>` is a DASL CIDv1 string.

Block references MUST be extracted from:
* the record body, and
* any string value anywhere within the record `fields` map (including nested objects/arrays), and
* the type body, and
* any string value anywhere within the type `fields` map (including nested objects/arrays).