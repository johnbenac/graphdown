---
typeId: req
recordId: REL-005
fields:
  title: GraphMD-created relationships are serialized as wiki-links
  order: 5
  testable: true
parent: section:8-relationships-and-linking
---


When GraphMD creates a relationship through its editing API/UI, it MUST serialize the relationship using wiki-link syntax `[[typeId:recordId]]` in the persisted Markdown content.