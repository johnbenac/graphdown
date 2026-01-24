---
typeId: req
recordId: "REL-002"
parent: "section:relationships-and-linking"
fields:
  title: "Where record relationships are extracted"
  order: 1
  testable: true
---


Core MUST extract record relationship targets from:

* the record body, and
* any string value anywhere within the record `fields` map (including nested objects/arrays).

Core MUST NOT extract relationships from type objects.
