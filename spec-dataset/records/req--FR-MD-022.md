---
typeId: req
recordId: "FR-MD-022"
parent: "section:markdown-record-file-format"
fields:
  title: "Body is raw Markdown"
  order: 3
---


The record body is everything after the closing `---`. It is raw Markdown and MAY be empty.

Core MUST treat the body as an uninterpreted string (except for link extraction; see §8).
