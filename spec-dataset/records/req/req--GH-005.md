---
typeId: req
recordId: GH-005
fields:
  title: Reject subdirectory URLs
  order: 4
parent: section:11-import-from-github-requirements
---


Importer **MUST** reject URLs that specify a subdirectory after `/tree/<ref>/` and instruct users to import from the repository root.