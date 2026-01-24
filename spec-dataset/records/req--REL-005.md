---
typeId: req
recordId: "REL-005"
parent: "section:relationships-and-linking"
fields:
  title: "GraphMD-created relationships are serialized as wiki-links"
  order: 4
  testable: true
---


When GraphMD creates a relationship through its editing API/UI, it MUST serialize the relationship using wiki-link syntax `[[typeId:recordId]]` in the persisted Markdown content.
