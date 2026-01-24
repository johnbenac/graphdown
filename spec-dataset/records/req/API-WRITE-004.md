---
typeId: "req"
recordId: "API-WRITE-004"
parent: "section:16p-1-mutations-and-atomic-commits"
fields:
  title: "Mutations are atomic at the dataset level"
  testable: false
  order: 3
---

A mutation MUST be atomic:

* either all file changes implied by the mutation are applied, or
* none are applied.

Partial commits are forbidden.

---
