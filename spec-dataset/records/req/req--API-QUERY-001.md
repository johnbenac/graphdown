---
typeId: req
recordId: API-QUERY-001
fields:
  title: No required text query language
  order: 1
  testable: false
parent: section:16p-5-query-helpers
---


The Runtime API MUST NOT require adopting any standardized external text query language (GraphQL, Datalog, etc.) for conformance.

If the Runtime API declares capability `gd.api.query`, it MAY provide query helper operations, but the existence or choice of a query language MUST NOT be required for conformance.

---