
# Graphdown Standard: Markdown Dataset Repositories

**Spec Version:** 0.2 (Draft)
**Last Updated:** 2025-12-30
**Status:** Normative / single source of truth

This document is the **only** authoritative specification for Graphdown. It **absorbs** and **replaces** any separate “dataset validity” documents. If there’s a conflict between documents, **this** one wins.

## Normative language

The keywords **MUST**, **MUST NOT**, **SHALL**, **SHOULD**, **SHOULD NOT**, and **MAY** are to be interpreted as described in RFC‑style specs:

* **MUST / SHALL** = required for conformance
* **MUST NOT / SHALL NOT** = forbidden for conformance
* **SHOULD** = recommended, but not strictly required
* **MAY** = optional

---

## 0. Governance and change policy

### GOV‑001 — Spec-first changes

Any change that affects externally observable behavior MUST:

* update this spec (normative text),
* update or add tests proving the behavior, and
* update the generated verification matrix to match the spec + tests.

---

## 1. Purpose and guiding principles

### P‑001 — Repository-first, Markdown-canonical

A Graphdown “Dataset” is a **repository** of Markdown files. **Markdown with YAML front matter is the canonical persistence format**.

* Runtime representations (in-memory graphs, indexes, caches) **MAY** exist.
* **Import/export boundaries are Markdown**, not JSON.

### P‑002 — Dataset defines the model

A Dataset contains **both**:

* the **data** (records), and
* the **data model** (types/schema-as-data)

No “per-dataset code” is allowed as a requirement for basic use.

### P‑003 — Universality and minimal assumptions

Graphdown is a universal CRUD + navigation engine.

* The core **MUST NOT** embed assumptions about domain schemas.
* The core **MUST** remain usable when encountering novel or arbitrary schemas.

---

## 2. Explicit non-requirements

These are not “maybe later” notes; they are **out of scope by design**, to prevent hidden second standards.

### NR‑UI‑001 — No standardized UI hints

The Graphdown standard **does not define** any standardized “UI hints” keys, formats, or semantics in datasets.

* A dataset **MAY** contain any keys whatsoever (including keys named `ui`, `widget`, `label`, etc.).
* **But**: core behavior MUST NOT depend on them.

### NR‑UI‑002 — Core must not interpret UI hints

Core implementations **MUST NOT**:

* require UI hint fields to exist,
* validate UI hints,
* interpret UI hints to change correctness/validity,
* reject datasets because “UI hints are unknown” or “UI hints are malformed”.

(Plugins MAY interpret any dataset content; that is explicitly out-of-scope of core.)

### NR‑SEM‑001 — No semantic value typing in core

Core implementations **MUST NOT** enforce semantic value rules like:

* “this value must be a boolean”
* “this value must be a date”
* “this value must be a money object”
* “this enum option must be from a declared set”
* formatting constraints

If you want those semantics, that’s plugin territory (or dataset-author tooling), not core.

### NR‑SEC‑001 — No security hardening requirement

This standard does not require defenses against malicious datasets (e.g., injection attempts). The spec is about interoperability and determinism, not adversarial threat models.

### NR‑LINK‑001 — No requirement that links resolve

Wiki-links MAY point to non-existent record IDs (Obsidian-style “uncreated” notes). Unresolved links are not an import-failing error.

---

## 3. Terminology

### Dataset

A **Dataset** is a Graphdown dataset/repository instance.

### Record

A **record** is a Markdown file with YAML front matter and an optional Markdown body, stored in the Dataset’s record directories (defined below).

### Dataset record, Type record, Data record

* **Dataset record:** describes the Dataset itself.
* **Type record:** defines a record type (schema-as-data).
* **Data record:** a normal domain record belonging to a type.

### Record ID

`id` — globally unique identifier string across the Dataset.

### Record type ID

`recordTypeId` — a stable identifier that names a type directory under `records/<recordTypeId>/`.

### Wiki-link

Obsidian-style link syntax: `[[some-id]]`

---

## 4. Repository layout requirements

### LAYOUT‑001 — Required directories

A Dataset root **MUST** contain:

* `datasets/`
* `types/`
* `records/`

### LAYOUT‑002 — What counts as a record file

A **record file** is any file that:

* ends in `.md`, and
* is located under one of:

  * `datasets/`
  * `types/`
  * `records/`

`.md` files outside those directories (e.g., a repo README) are **not** record files and are ignored by core validators/loaders.

### LAYOUT‑003 — Exactly one dataset record

`datasets/` **MUST** contain exactly one dataset record file (`.md`).
Subdirectories under `datasets/` are allowed, but the total count of dataset record files must still be exactly one.

### LAYOUT‑004 — Type records location

Type records **MUST** be stored under `types/`. Nesting is allowed.

### LAYOUT‑005 — Data records location

Data records **MUST** be stored under:

* `records/<recordTypeId>/.../*.md`

Nesting under the type directory is allowed.

---

## 5. Markdown record file format

### FR‑MD‑020 — YAML front matter is required

Every record file **MUST** start with YAML front matter delimited by:

```md
---
<yaml object>
---
<body markdown>
```

Import/validation **MUST** fail if:

* front matter is missing,
* YAML is invalid, or
* YAML parses to a non-object (array/string/null).

### FR‑MD‑021 — Required top-level fields

Every record YAML object **MUST** define:

* `id` (string; non-empty after trimming)
* `datasetId` (string; non-empty after trimming)
* `typeId` (string; non-empty after trimming)
* `createdAt` (string; non-empty)
* `updatedAt` (string; non-empty)
* `fields` (object/map)

### FR‑MD‑022 — Body is raw Markdown

The record body is everything after the closing `---`. It is raw Markdown and MAY be empty.

Core MUST treat the body as an uninterpreted string (except for link extraction; see §8).

---

## 6. Reserved keys and extensibility rules

### EXT‑001 — Minimal reserved vocabulary

Core implementations SHALL recognize only these reserved top-level YAML keys:

* `id`, `datasetId`, `typeId`, `createdAt`, `updatedAt`, `fields`

All other top-level keys are **allowed** and MUST be treated as opaque data.

### EXT‑002 — `fields` is open

`fields` MAY contain any YAML value shapes:

* scalars (string/number/bool/null)
* arrays
* objects/maps
* arbitrarily nested structures

Core MUST NOT reject records because `fields` contains unfamiliar structures.

---

## 7. Types and schema-as-data

### TYPE‑001 — Type records are the schema source of truth

A Dataset’s schema is defined by its **type records** under `types/`.

Type records MUST satisfy:

* `typeId` MUST equal `sys:type`
* `datasetId` MUST equal the dataset record’s `id`
* `fields.recordTypeId` MUST exist and be a string

### TYPE‑002 — `recordTypeId` directory compatibility

`fields.recordTypeId` MUST be a stable directory-safe identifier.

It MUST match:

* starts with an alphanumeric character, then
* contains only alphanumerics, `_`, `-`

Example regex: `^[A-Za-z0-9][A-Za-z0-9_-]*$`

### TYPE‑003 — recordTypeId uniqueness

Each `fields.recordTypeId` MUST be unique across all type records.

### TYPE‑004 — Optional schema definition: `fieldDefs`

A type record MAY define field schema under:

* `fields.fieldDefs`

If present, `fields.fieldDefs` MUST be a **map keyed by field name**:

```yaml
fields:
  recordTypeId: ticket
  fieldDefs:
    title:
      kind: string
      required: true
    status:
      kind: enum
```

### TYPE‑005 — Field definition minimum shape

Each field definition object MUST include:

* `kind`: **string**

It MAY include:

* `required`: boolean

It MAY include any other keys (constraints, metadata, hints, plugin-specific config).
Core MUST treat any other keys as opaque.

### TYPE‑006 — Open world field kinds

`kind` is an **opaque identifier string**.

Core implementations:

* **MUST NOT** maintain a closed allowlist of kinds for validity.
* **MUST NOT** reject a dataset because it contains unfamiliar `kind` strings.
* **MUST NOT** require plugins to exist for a dataset to be valid.

### TYPE‑007 — Body semantics: `bodyField` (optional)

A type record MAY specify:

* `fields.bodyField: <string>`

This declares the *conceptual* name of the record’s Markdown body field (for labeling / UX purposes).
Core MUST NOT require `bodyField` to exist.

---

## 8. Relationships and linking

### REL‑001 — Canonical relationship marker is Obsidian wiki-link syntax

A relationship is expressed canonically as a wiki-link token:

* `[[target-record-id]]`

### REL‑002 — Where relationships may appear

Wiki-links may appear in:

* record bodies, and/or
* any string value anywhere within `fields` (including nested objects/arrays)

Core MUST be able to extract link targets from both locations.

### REL‑003 — ID normalization for link resolution

When interpreting a wiki-link, core MUST normalize link targets by:

* trimming surrounding whitespace
* unwrapping `[[...]]` if present
* treating empty/blank as null

(This is the conceptual “cleanId” behavior.)

### REL‑004 — Preservation: do not rewrite link spellings

Core implementations **MUST NOT** rewrite user-authored link spellings during import/export, including:

* converting `[[id]]` → `id`
* converting `id` → `[[id]]`
* “normalizing” casing, punctuation, or whitespace inside stored text

Relationships are extracted for graph behavior, but the stored bytes are treated as user-authored text.

### REL‑005 — Creating links in Graphdown-authored edits

When Graphdown itself creates a new relationship via UI (“link/unlink”), it MUST write links using **wiki-link syntax** `[[id]]` (not bare IDs).

This is the Obsidian-compatibility invariant: Graphdown-authored relationships are always visible to Obsidian as links.

---

## 9. Import-time validity and integrity rules

### VAL‑001 — Dataset/type/records must be internally consistent

Import MUST fail if:

* required directories are missing (§4)
* dataset record count is not exactly one (§4)
* any record file fails record format requirements (§5)
* record IDs are not globally unique (§9.2)
* a data record’s `typeId` has no matching type definition (§9.3)
* `records/<dir>/` exists with no corresponding `recordTypeId` (§9.3)

### VAL‑002 — Global ID uniqueness

All `id` values across dataset record, type records, and data records MUST be globally unique. Duplicates are fatal.

### VAL‑003 — Dataset identity consistency

For all records:

* `datasetId` MUST equal the dataset record `id`

### VAL‑004 — Data record directory/type consistency

For any data record at path `records/<recordTypeId>/.../x.md`:

* YAML `typeId` MUST equal `<recordTypeId>`

### VAL‑005 — Required fields (schema-driven)

If a type defines `fields.fieldDefs`, then for each field where `required: true`:

* every record of that type MUST contain `fields.<fieldName>` with a value that is not:

  * missing,
  * null,
  * or an all-whitespace string.

(For arrays/objects, “empty” is not defined as invalid by core; only missing/null/blank-string is.)

### VAL‑006 — No semantic validation of values

Beyond VAL‑005, core MUST NOT validate field values against:

* kind semantics,
* constraints,
* enum option sets,
* number ranges,
* date formats,
* money shapes, etc.

Those are not validity rules in this standard.

---

## 10. Error reporting requirements

### ERR‑001 — File-specific errors when possible

Validators/importers MUST report errors with:

* the file path (when applicable), and
* a stable error code, and
* a human-readable message.

### ERR‑002 — Clear failure categories for GitHub import

UI MUST differentiate at least:

* invalid URL format
* repo not found (404)
* private/auth required (401/403)
* rate limited (403 + hint)
* dataset invalid (structural/validation errors)

---

## 11. Import from GitHub requirements

### GH‑001 — Supported URL forms

Import MUST accept:

* `github.com/<owner>/<repo>`
* `https://github.com/<owner>/<repo>`
* `github.com/<owner>/<repo>/tree/<ref>/<optional/subdir>`

### GH‑002 — Default ref resolution

If no ref is provided, importer MUST use the repository default branch (fallback to `main` if unavailable).

### GH‑003 — Recursive listing + raw fetch

Importer MUST:

* list files recursively via GitHub tree API (`?recursive=1`)
* fetch contents via `raw.githubusercontent.com`

### GH‑005 — Subdirectory scoping

If a subdirectory is specified, importer MUST scope listing/reads to that subdirectory, treating it as the Dataset root.

### GH‑008 — Public repo import requires no auth

Unauthenticated import from public repositories MUST work for MVP.

---

## 12. Export requirements

### EXP‑001 — Export is Markdown repositories

Export MUST produce Markdown files suitable for committing to Git.

### EXP‑002 — Dataset-only export

Export MUST support exporting the Dataset subset:

* dataset record
* type records
* all data records
  as a zip archive.

### EXP‑003 — Whole-repo export

Export MUST support exporting the entire repository snapshot (including non-record files) as a zip archive.

### EXP‑004 — Path stability

When exporting records that were imported from specific paths, export MUST preserve those paths (unless the user explicitly relocates records).

### EXP‑005 — Content preservation (no “reformat the universe”)

Export MUST NOT rewrite record content merely to “normalize” it, including:

* rewriting wiki-links (§8)
* reformatting YAML keys or changing scalar spellings
* rewrapping strings / changing quotes

Graphdown should only change what the user actually edited.

---

## 13. UI requirements

### UI‑001 — Desktop + mobile usable

UI shall be usable on desktop and mobile form factors.

### UI‑004 — Consistent CRUD + relationship affordances

UI shall provide consistent affordances for:

* create
* edit
* delete
* link/unlink relationships (Obsidian-style wiki-links)
* navigate to related records

### NFR‑001 — No full reloads for CRUD

CRUD operations shall update UI without full page reloads.

### NFR‑010 — Offline after initial load

The system shall function offline after initial load.

### UI‑RAW‑001 — Universal raw CRUD fallback (required)

Regardless of schema content, field kinds, or plugins, the UI MUST always be able to:

* display record YAML `fields` in a raw, editable form
* allow copy/paste editing of values as text
* save edits back into Markdown record files

Rich widgets are optional; raw CRUD is mandatory.

---

## 14. Plugin and extensibility requirements

### NFR‑030 — Plugins must not require core modification

The system shall be structured so plugins do not require modifying core code.

### NFR‑031 — New field kinds without rewriting CRUD

New field kinds shall be addable without rewriting the CRUD engine.

This means:

* core MUST treat kinds as opaque (§7)
* core MUST always offer raw fallback (§13)

Plugins MAY:

* interpret kinds,
* interpret arbitrary metadata (including UI-hint-like keys),
* provide nicer editors/renderers/validators,
* add alternative navigation or views,

…but core MUST remain correct without them.

---

## 15. System-level acceptance criteria

A build is acceptable when:

1. A user can define a new Type with fields in the model editor.
2. That Type automatically appears in navigation.
3. A user can create, edit, and delete records of that Type.
4. A user can define a relationship and link records accordingly (wiki-link semantics).
5. A user can export the Dataset, re-import it, and all records + relationships + views are intact.
6. Adding a new Type requires **zero code changes** to be usable via CRUD and navigation.

---

## Appendix A. Minimal examples

### Dataset record example

```md
---
id: dataset:demo
datasetId: dataset:demo
typeId: sys:dataset
createdAt: 2025-01-01T00:00:00Z
updatedAt: 2025-01-01T00:00:00Z
fields:
  name: Demo
---
Welcome to the demo Dataset.
```

### Type record example with map-shaped `fieldDefs`

```md
---
id: type:ticket
datasetId: dataset:demo
typeId: sys:type
createdAt: 2025-01-01T00:00:00Z
updatedAt: 2025-01-01T00:00:00Z
fields:
  recordTypeId: ticket
  bodyField: description
  fieldDefs:
    title:
      kind: smoke-signal
      required: true
    tags:
      kind: whatever
---
```

### Data record with wiki-links in YAML and body

```md
---
id: ticket:one
datasetId: dataset:demo
typeId: ticket
createdAt: 2025-01-02T00:00:00Z
updatedAt: 2025-01-02T00:00:00Z
fields:
  title: "[[project:alpha]] kickoff"
  tags:
    - "[[tag:import]]"
    - "[[tag:relationships]]"
---
Blocked by [[ticket:two]].
