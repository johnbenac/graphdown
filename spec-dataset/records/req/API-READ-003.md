---
typeId: "req"
recordId: "API-READ-003"
parent: "section:required-read-operations-types-and-records"
fields:
  title: "Raw Markdown access for type/record files is available"
  testable: false
  order: 2
---

The Runtime API MUST provide a read operation to retrieve the raw Markdown content for:

* a type object record file, and
* a record object record file

The returned content MUST be available as either:

* UTF-8 string (failing on invalid UTF-8), or
* raw bytes (`Uint8Array`).

This requirement exists to support Markdown-first workflows (P-001) without requiring clients to reconstruct Markdown from structured data.

---
