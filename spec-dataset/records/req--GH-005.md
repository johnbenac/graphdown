---
typeId: req
recordId: "GH-005"
parent: "section:import-from-github-requirements"
fields:
  title: "Reject subdirectory URLs"
  order: 3
---


Importer **MUST** reject URLs that specify a subdirectory after `/tree/<ref>/` and instruct users to import from the repository root.
