---
typeId: req
recordId: REL-004
fields:
  title: "Preservation: do not rewrite link spellings"
  order: 4
  testable: false
parent: section:8-relationships-and-linking
---


Core implementations **MUST NOT** rewrite user-authored link spellings during import/export, including:

* converting `[[typeId:recordId]]` → `typeId:recordId`
* converting bare strings → `[[typeId:recordId]]`
* “normalizing” casing, punctuation, or whitespace inside stored text

Relationships are extracted for graph behavior, but the stored bytes are treated as user-authored text. (See EXP-005 for the export conformance rule.)