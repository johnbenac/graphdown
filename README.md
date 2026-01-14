# Graphdown

Graphdown is a toolkit for **Markdown-first datasets** defined by the **Graphdown Standard**.
It ships:

- the **standard** (`SPEC.md`) — the single source of truth
- a **web app** (`apps/web`) for importing/browsing/editing datasets
- a **core domain library** (`packages/core/src`) for parsing, validation, hashing, and export/import helpers

> If anything conflicts with `SPEC.md`, `SPEC.md` wins.

## What is a Graphdown dataset?

A Graphdown dataset is a collection of Markdown “record files” (and optional block files).
Records are defined by **YAML front matter** plus a raw Markdown body.

### Record identity (SPEC v0.4+)

Records are identified by the pair:

- `typeId` — which type the record belongs to
- `recordId` — the record’s ID within that type

Together they form the globally unique computed identity:

- `recordKey = typeId:recordId`

Record relationships use wiki-links: `[[typeId:recordId]]`.

## Quick start (developers)

Install dependencies:

```sh
npm ci
```

Run the web app:

```sh
npm run dev:web
# Vite defaults to http://localhost:5173
```

Run tests:

```sh
npm --workspace apps/web run test
npm --workspace apps/web run verify
```

Testing conventions live in [`docs/testing.md`](docs/testing.md).

Regenerate spec trace artifacts (when editing SPEC requirements):

```sh
npm run spec:trace
```

## Dataset format (minimal examples)

Graphdown distinguishes **type objects** and **record objects**.

### Type object (FR-MD-021)

A type object is a record file whose YAML contains:

* `typeId` (string)
* `fields` (object)

It MUST NOT contain `recordId`, `parent`, or any other top-level keys.

```md
---
typeId: note
fields:
  displayName: Notes
  fieldDefs:
    title:
      required: true
  composition:
    tag:
      typeId: tag
      required: false
---

Optional Markdown body describing the type.
```

### Record object (FR-MD-023)

A record object is a record file whose YAML contains:

* `typeId` (string)
* `recordId` (string)
* `fields` (object)
* optional `parent` (string record reference or null)

```md
---
typeId: note
recordId: one
fields:
  title: First note
---

This note links to [[note:two]].
```

### Parent hierarchy (HIER-001)

Records may define a parent pointer:

```md
---
typeId: note
recordId: child
parent: note:one
fields: {}
---
```

Parent pointers:

* MUST resolve to an existing record
* MUST be acyclic

Parent pointers are structural. They are not “relationships” under REL-001.

## Relationships and “graphs” (terminology)

This codebase contains multiple graph-like structures. In docs, avoid saying “graph” without specifying which one.

* **Record Link Graph**: wiki-link relationships extracted from record bodies and record field strings
* **Record Hierarchy**: parent pointer structure (`parent:`)
* **Type Composition Dependencies**: type → type requirements (`fields.composition`)
* **Block Dependency Graph**: record → block CID references (`[[<cid>]]`)
* **Canonical Layout Tree**: deterministic export directory tree (EXP-HIER-001)

See:

* `docs/terminology.md`
* `docs/concepts/graphs.md`

## Example datasets

Reference datasets used for compatibility checks:

* [https://github.com/johnbenac/product-tracker-dataset](https://github.com/johnbenac/product-tracker-dataset)
* [https://github.com/johnbenac/research-lab-dataset](https://github.com/johnbenac/research-lab-dataset)

## Repo layout (implementation)

* `SPEC.md` — Graphdown standard (normative)
* `apps/web/` — React/Vite web app
* `packages/core/src/` — core parsing/validation/hashing/export/import utilities
* `docs/` — developer concept docs (glossary, graphs, snapshots/layout)
* `artifacts/spec-trace/` — generated spec-to-test traceability artifacts
