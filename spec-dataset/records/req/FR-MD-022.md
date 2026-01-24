---
typeId: req
recordId: FR-MD-022
fields:
  title: Body is raw Markdown
  order: 3
parent: section:5-markdown-record-file-format
---
The record body is everything after the closing `---`. It is raw Markdown and MAY be empty.

Core MUST treat the body as an uninterpreted string (except for link extraction; see §8).
