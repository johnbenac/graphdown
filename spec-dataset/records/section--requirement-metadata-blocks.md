---
typeId: section
recordId: "requirement-metadata-blocks"
parent: "spec:graphmd-standard-v0-5"
fields:
  title: "Requirement metadata blocks"
  order: 1
  level: 2
---


To make the verification matrix machine-derivable, every requirement heading MUST be preceded by a single-line HTML comment with a stable `id` and `title`.

Format:

```md
<!-- req:id=LAYOUT-001 title="Required directories" -->
### LAYOUT-001 — Required directories
```

Additional attributes MAY be added later (for example `testable=true|false` or `tests="path/to/test"`), but `id` and `title` are mandatory for extraction.

Some governance/process requirements MAY set `testable=false`; these are normative for spec maintenance but are not required to have automated tests.

Attribute semantics:

* `testable=false` — governance/manual only; excluded from coverage gates.
* `testable=true` — **must** have referenced tests; enforced by CI.
* omitted/null — tracked in the matrix but not gated; adding tests is optional.

---
