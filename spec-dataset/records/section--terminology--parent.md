---
typeId: section
recordId: "terminology--parent"
parent: "section:terminology"
fields:
  title: "parent"
  order: 6
  level: 3
---


`parent` is an optional top-level key on **record objects**.

When present and non-null, `parent` is a record reference string `typeId:recordId` that defines the record’s parent in the record hierarchy (HIER-001).

When `parent` is missing or null, the record is a hierarchy root.
