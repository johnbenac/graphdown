---
typeId: req
recordId: API-WRITE-007
fields:
  title: Structured relationship editing serializes as wiki-links
  order: 6
  commentGap: 1
  testable: false
parent: section:16p-1-mutations-and-atomic-commits
---
If the Runtime API provides any structured operation that creates record relationships (as opposed to raw text replacement), it MUST serialize created relationships using wiki-link syntax:

`[[typeId:recordId]]`

as required by REL-005.

---
