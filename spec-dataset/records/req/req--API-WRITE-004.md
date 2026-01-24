---
typeId: req
recordId: API-WRITE-004
fields:
  title: Mutations are atomic at the dataset level
  order: 4
  testable: false
parent: section:16p-1-mutations-and-atomic-commits
---


A mutation MUST be atomic:

* either all file changes implied by the mutation are applied, or
* none are applied.

Partial commits are forbidden.

---