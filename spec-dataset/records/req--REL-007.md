---
typeId: req
recordId: "REL-007"
parent: "section:relationships-and-linking"
fields:
  title: "Only composite wiki-links are relationships in core"
  order: 5
  testable: true
---


Core MUST recognize relationships only from wiki-link tokens `[[typeId:recordId]]`.

Core MUST NOT infer relationships from structured YAML shapes, bare IDs, or any other conventions.

Such shapes MAY exist as opaque user data per EXT-002, but they have no relationship semantics in core.
