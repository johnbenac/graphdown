
# Graphdown Standard: Markdown Dataset Repositories

**Spec Version:** 0.2 (Draft)
**Last Updated:** 2025-12-30
**Status:** Normative / single source of truth

This document is the **only** authoritative specification for Graphdown. It **absorbs** and **replaces** any separate “dataset validity” documents. If there’s a conflict between documents, **this** one wins.

## Normative language

The keywords **MUST**, **MUST NOT**, **SHALL**, **SHOULD**, **SHOULD NOT**, and **MAY** are to be interpreted as described in RFC-style specs:

* **MUST / SHALL** = required for conformance
* **MUST NOT / SHALL NOT** = forbidden for conformance
* **SHOULD** = recommended, but not strictly required
* **MAY** = optional

---

## Requirement metadata blocks

To make the verification matrix machine-derivable, every requirement heading MUST be preceded by a single-line HTML comment with a stable `id` and `title`.

Format:

```md
<!-- req:id=LAYOUT-001 title="Required directories" -->
### LAYOUT-001 — Required directories
```

Additional attributes MAY be added later (for example `testable=true` or `tests="path/to/test"`), but `id` and `title` are mandatory for extraction.

---

## 0. Governance and change policy

<!-- req:id=GOV-001 title="Spec-first changes" -->
### GOV-001 — Spec-first changes

Any change that affects externally observable behavior MUST:

* update this spec (normative text),
* update or add tests proving the behavior, and
* update the generated verification matrix to match the spec + tests.

---

## 1. Purpose and guiding principles

<!-- req:id=P-001 title="Repository-first, Markdown-canonical" -->
### P-001 — Repository-first, Markdown-canonical

A Graphdown “Dataset” is a **repository** of Markdown files. **Markdown with YAML front matter is the canonical persistence format**.

* Runtime representations (in-memory graphs, indexes, caches) **MAY** exist.
* **Import/export boundaries are Markdown**, not JSON.

<!-- req:id=P-002 title="Dataset defines the model" -->
### P-002 — Dataset defines the model

A Dataset contains **both**:

* the **data** (records), and
* the **data model** (types/schema-as-data)

No “per-dataset code” is allowed as a requirement for basic use.

<!-- req:id=P-003 title="Universality and minimal assumptions" -->
### P-003 — Universality and minimal assumptions

Graphdown is a universal CRUD + navigation engine.

* The core **MUST NOT** embed assumptions about domain schemas.
* The core **MUST** remain usable when encountering novel or arbitrary schemas.

---

## 2. Explicit non-requirements

These are not “maybe later” notes; they are **out of scope by design**, to prevent hidden second standards.

<!-- req:id=NR-UI-001 title="No standardized UI hints" -->
### NR-UI-001 — No standardized UI hints

The Graphdown standard **does not define** any standardized “UI hints” keys, formats, or semantics in datasets.

* A dataset **MAY** contain any keys whatsoever (including keys named `ui`, `widget`, `label`, etc.).
* **But**: core behavior MUST NOT depend on them.

<!-- req:id=NR-UI-002 title="Core must not interpret UI hints" -->
### NR-UI-002 — Core must not interpret UI hints

Core implementations **MUST NOT**:

* require UI hint fields to exist,
* validate UI hints,
* interpret UI hints to change correctness/validity,
* reject datasets because “UI hints are unknown” or “UI hints are malformed”.

(Plugins MAY interpret any dataset content; that is explicitly out-of-scope of core.)

<!-- req:id=NR-SEM-001 title="No semantic value typing in core" -->
### NR-SEM-001 — No semantic value typing in core

Core implementations **MUST NOT** enforce semantic value rules like:

* “this value must be a boolean”
* “this value must be a date”
* “this value must be a money object”
* “this enum option must be from a declared set”
* formatting constraints

If you want those semantics, that’s plugin territory (or dataset-author tooling), not core.

<!-- req:id=NR-SEC-001 title="No security hardening requirement" -->
### NR-SEC-001 — No security hardening requirement

This standard does not require defenses against malicious datasets (e.g., injection attempts). The spec is about interoperability and determinism, not adversarial threat models.

<!-- req:id=NR-LINK-001 title="No requirement that links resolve" -->
### NR-LINK-001 — No requirement that links resolve (except composition constraints)

Wiki-links MAY point to non-existent record IDs (Obsidian-style “uncreated” notes). Unresolved links are not an import-failing error.

Exception: unresolved links **do not** satisfy composition constraints (VAL-COMP-002). Import MUST fail when composition requirements are unmet.

---

## 3. Terminology

### Dataset

A **Dataset** is a Graphdown dataset/repository instance.

### Record

A **record** is a Markdown file with YAML front matter and an optional Markdown body, stored in the Dataset’s record directories (`types/` and `records/`).

### Type record, Data record

* **Type record:** defines a record type (schema-as-data).
* **Data record:** a normal domain record belonging to a type.

### Record ID

`id` — globally unique identifier string across the Dataset.

### Record type ID

`recordTypeId` — a stable identifier that names a type directory under `records/<recordTypeId>/`.

### Wiki-link

Obsidian-style link syntax: `[[some-id]]`

---

## 3.1 Dataset identity hashes

A Dataset’s identity is computed from its record files, not from any human-managed dataset record.
This standard defines two computed identity values:

* **Schema fingerprint**: based on type records only (`types/`)
* **Snapshot fingerprint**: based on type records + data records (`types/` + `records/`)

No “records-only” fingerprint is defined in core.

<!-- req:id=HASH-001 title="Canonical dataset hashing (gdhash-v1)" -->
### HASH-001 — Canonical dataset hashing (gdhash-v1)

Core implementations MUST be able to compute deterministic hashes over Graphdown record files.

Unless a future version of this spec defines otherwise, the canonical hashing procedure is **gdhash-v1**:

1. **Discover included record files**
   * Record files are discovered per LAYOUT-002.

2. **Normalize each included record file**
   For each included record file:
   * Read the entire file as bytes.
   * Decode as UTF-8 text. Import MUST fail if UTF-8 decoding fails.
   * For hashing only, normalize line endings by converting all `\r\n` and bare `\r` to `\n`.
   * Parse YAML front matter and extract the record `id` (per FR-MD-021). Import MUST fail if parsing fails.
   * If two included record files share the same trimmed `id`, hashing MUST fail.

3. **Sort**
   Sort included records by their parsed `id` in ascending lexicographic order of the UTF-8 encoded bytes of `id`.

4. **Build the byte stream**
   Build the byte stream to hash as:

   * prefix: the UTF-8 bytes of the literal string `graphdown:gdhash:v1` followed by a single NUL byte (`0x00`)
   * then, for each record in sorted order, append:

     * the record `id` as UTF-8 bytes, then NUL (`0x00`)
     * the decimal byte length of the normalized file content (ASCII digits), then NUL (`0x00`)
     * the normalized file content bytes
     * NUL (`0x00`)

5. **Digest**
   Compute `SHA-256` over the resulting byte stream.

The resulting digest MUST be encoded as lowercase hexadecimal.

<!-- req:id=HASH-002 title="Schema fingerprint (types only)" -->
### HASH-002 — Schema fingerprint (types only)

Implementations MUST compute a **schema fingerprint** for a dataset.

The schema fingerprint is the gdhash-v1 SHA-256 digest computed over **all record files under `types/`** (recursively), and over no other files.

<!-- req:id=HASH-003 title="Snapshot fingerprint (types + data records)" -->
### HASH-003 — Snapshot fingerprint (types + data records)

Implementations MUST compute a **snapshot fingerprint** for a dataset.

The snapshot fingerprint is the gdhash-v1 SHA-256 digest computed over:

* all record files under `types/` (recursively), and
* all record files under `records/` (recursively)

and over no other files.

<!-- req:id=HASH-004 title="No records-only fingerprint in core" -->
### HASH-004 — No records-only fingerprint in core

This standard defines no “records-only” fingerprint.

Implementations MAY compute additional hashes for their own purposes, but core conformance MUST NOT depend on them, and they MUST NOT be presented as a Graphdown-standardized identity value.

## 4. Repository layout requirements

<!-- req:id=LAYOUT-001 title="Required directories" -->
### LAYOUT-001 — Required directories

A Dataset root **MUST** contain:

* `types/`
* `records/`

<!-- req:id=LAYOUT-002 title="What counts as a record file" -->
### LAYOUT-002 — What counts as a record file

A **record file** is any file that:

* ends in `.md`, and
* is located under one of:

  * `types/`
  * `records/`

`.md` files outside those directories (e.g., a repo README) are **not** record files and are ignored by core validators/loaders.

<!-- req:id=LAYOUT-004 title="Type records location" -->
### LAYOUT-004 — Type records location

Type records **MUST** be stored under `types/`.

Validators/importers **MUST** discover type records **recursively** under `types/`. Subdirectory names are organizational only and carry no semantic meaning.

<!-- req:id=LAYOUT-005 title="Data records location" -->
### LAYOUT-005 — Data records location

Data records **MUST** be stored under:

* `records/<recordTypeId>/.../*.md`

Validators/importers **MUST** discover data records **recursively** under `records/<recordTypeId>/`. Subdirectory names are organizational only and carry no semantic meaning.

---

## 5. Markdown record file format

<!-- req:id=FR-MD-020 title="YAML front matter is required" -->
### FR-MD-020 — YAML front matter is required

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

<!-- req:id=FR-MD-021 title="Required top-level fields" -->
### FR-MD-021 — Required top-level fields

Every record YAML object **MUST** define:

* `id` (string; non-empty after trimming)
* `typeId` (string; non-empty after trimming)
* `createdAt` (string; non-empty)
* `updatedAt` (string; non-empty)
* `fields` (object/map)

<!-- req:id=FR-MD-022 title="Body is raw Markdown" -->
### FR-MD-022 — Body is raw Markdown

The record body is everything after the closing `---`. It is raw Markdown and MAY be empty.

Core MUST treat the body as an uninterpreted string (except for link extraction; see §8).

---

## 6. Reserved keys and extensibility rules

<!-- req:id=EXT-001 title="Minimal reserved vocabulary" -->
### EXT-001 — Minimal reserved vocabulary

Core implementations SHALL recognize only these reserved top-level YAML keys:

* `id`, `typeId`, `createdAt`, `updatedAt`, `fields`

All other top-level keys are **allowed** and MUST be treated as opaque data.

<!-- req:id=EXT-002 title="`fields` is open" -->
### EXT-002 — `fields` is open

`fields` MAY contain any YAML value shapes:

* scalars (string/number/bool/null)
* arrays
* objects/maps
* arbitrarily nested structures

Core MUST NOT reject records because `fields` contains unfamiliar structures.

---

## 7. Types and schema-as-data

<!-- req:id=TYPE-001 title="Type records are the schema source of truth" -->
### TYPE-001 — Type records are the schema source of truth

A Dataset’s schema is defined by its **type records** under `types/`.

All record files under `types/` are type records.

Type records MUST satisfy:

* `typeId` MUST equal `sys:type`
* `fields.recordTypeId` MUST exist and be a string

<!-- req:id=TYPE-002 title="`recordTypeId` directory compatibility" -->
### TYPE-002 — `recordTypeId` directory compatibility

`fields.recordTypeId` MUST be a stable directory-safe identifier.

It MUST match:

* starts with an alphanumeric character, then
* contains only alphanumerics, `_`, `-`

Example regex: `^[A-Za-z0-9][A-Za-z0-9_-]*$`

<!-- req:id=TYPE-003 title="recordTypeId uniqueness" -->
### TYPE-003 — recordTypeId uniqueness

Each `fields.recordTypeId` MUST be unique across all type records.

<!-- req:id=TYPE-004 title="Optional schema definition: `fieldDefs`" -->
### TYPE-004 — Optional schema definition: `fieldDefs`

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

<!-- req:id=TYPE-005 title="Field definition minimum shape" -->
### TYPE-005 — Field definition minimum shape

Each field definition object MUST include:

* `kind`: **string**

It MAY include:

* `required`: boolean

It MAY include any other keys (constraints, metadata, hints, plugin-specific config).
Core MUST treat any other keys as opaque.

<!-- req:id=TYPE-006 title="Open world field kinds" -->
### TYPE-006 — Open world field kinds

`kind` is an **opaque identifier string**.

Core implementations:

* **MUST NOT** maintain a closed allowlist of kinds for validity.
* **MUST NOT** reject a dataset because it contains unfamiliar `kind` strings.
* **MUST NOT** require plugins to exist for a dataset to be valid.

<!-- req:id=TYPE-007 title="Body semantics: `bodyField` (optional)" -->
### TYPE-007 — Body semantics: `bodyField` (optional)

A type record MAY specify:

* `fields.bodyField: <string>`

This declares the *conceptual* name of the record’s Markdown body field (for labeling / UX purposes).
Core MUST NOT require `bodyField` to exist.

<!-- req:id=TYPE-COMP-001 title="Optional type composition metadata" -->
### TYPE-COMP-001 — Optional type composition metadata

A type record MAY declare compositional requirements under:

* `fields.composition`

If present, `fields.composition` MUST be a map keyed by component name.

Each component value MUST be an object containing:

* `recordTypeId` (string; required; MUST satisfy TYPE-002 pattern)

It MAY include:

* `min` (integer >= 0; default 1)
* `max` (integer >= `min`)

Core MUST treat any other keys inside component objects as opaque.

---

## 8. Relationships and linking

<!-- req:id=REL-001 title="Canonical relationship marker is Obsidian wiki-link syntax" -->
### REL-001 — Canonical relationship marker is Obsidian wiki-link syntax

A relationship is expressed canonically as a wiki-link token:

* `[[target-record-id]]`

<!-- req:id=REL-002 title="Where relationships may appear" -->
### REL-002 — Where relationships may appear

Wiki-links may appear in:

* record bodies, and/or
* any string value anywhere within `fields` (including nested objects/arrays)

Core MUST be able to extract link targets from both locations.

<!-- req:id=REL-003 title="ID normalization for link resolution" -->
### REL-003 — ID normalization for link resolution

When interpreting a wiki-link, core MUST normalize link targets by:

* trimming surrounding whitespace
* unwrapping `[[...]]` if present
* treating empty/blank as null

(This is the conceptual “cleanId” behavior.)

<!-- req:id=REL-004 title="Preservation: do not rewrite link spellings" -->
### REL-004 — Preservation: do not rewrite link spellings

Core implementations **MUST NOT** rewrite user-authored link spellings during import/export, including:

* converting `[[id]]` → `id`
* converting `id` → `[[id]]`
* “normalizing” casing, punctuation, or whitespace inside stored text

Relationships are extracted for graph behavior, but the stored bytes are treated as user-authored text.

<!-- req:id=REL-005 title="Creating links in Graphdown-authored edits" -->
### REL-005 — Creating links in Graphdown-authored edits

When Graphdown itself creates a new relationship via UI (“link/unlink”), it MUST write links using **wiki-link syntax** `[[id]]` (not bare IDs).

This is the Obsidian-compatibility invariant: Graphdown-authored relationships are always visible to Obsidian as links.

<!-- req:id=REL-007 title="Only wiki-links are recognized as relationships in core" -->
### REL-007 — Only wiki-links are recognized as relationships in core

Core MUST recognize relationships **only** via wiki-link tokens `[[target-record-id]]` as defined in REL-001/REL-002.

Core MUST NOT infer relationships from:

* the presence of `{ ref: ... }` / `{ refs: [...] }` wrappers or bare IDs (e.g., `{ ref: "record:abc" }`)

Relationships are recognized only from wiki-link tokens `[[...]]`, regardless of where the string occurs within `fields`.

Such shapes MAY exist as opaque user data per EXT-002, but they have no relationship semantics in core.

---

## 9. Import-time validity and integrity rules

<!-- req:id=VAL-001 title="Type/records must be internally consistent" -->
### VAL-001 — Type/records must be internally consistent

Import MUST fail if:

* required directories are missing (§4)
* any record file fails record format requirements (§5)
* any type record fails type requirements (§7)
* record IDs are not globally unique (§9.2)
* a data record’s `typeId` has no matching type definition (§9.3)
* `records/<dir>/` exists with no corresponding `recordTypeId` (§9.3)

<!-- req:id=VAL-002 title="Global ID uniqueness" -->
### VAL-002 — Global ID uniqueness

All `id` values across type records and data records MUST be globally unique. Duplicates are fatal.

<!-- req:id=VAL-004 title="Data record directory/type consistency" -->
### VAL-004 — Data record directory/type consistency

For any data record at path `records/<recordTypeId>/.../x.md`:

* YAML `typeId` MUST equal `<recordTypeId>`

<!-- req:id=VAL-005 title="Required fields (schema-driven)" -->
### VAL-005 — Required fields (schema-driven)

If a type defines `fields.fieldDefs`, then for each field where `required: true`:

* every record of that type MUST contain `fields.<fieldName>` with a value that is not:

  * missing,
  * null,
  * or an all-whitespace string.

(For arrays/objects, “empty” is not defined as invalid by core; only missing/null/blank-string is.)

<!-- req:id=VAL-006 title="No semantic validation of values" -->
### VAL-006 — No semantic validation of values

Beyond VAL-005, core MUST NOT validate field values against:

* kind semantics,
* constraints,
* enum option sets,
* number ranges,
* date formats,
* money shapes, etc.

Those are not validity rules in this standard.

<!-- req:id=VAL-COMP-001 title="Composition referenced record types must exist" -->
### VAL-COMP-001 — Composition referenced record types must exist

If a type declares `fields.composition`, then every referenced `recordTypeId` MUST have a corresponding type definition in the dataset. Import MUST fail otherwise.

<!-- req:id=VAL-COMP-002 title="Composition requirements must be satisfied by outgoing wiki-links" -->
### VAL-COMP-002 — Composition requirements must be satisfied by outgoing wiki-links

If a type declares `fields.composition`, then for each data record of that type:

* outgoing relationships MUST include at least `min` links to existing data records whose `typeId` equals the component `recordTypeId`
* if `max` is specified, outgoing relationships MUST include no more than `max` such links

Outgoing relationships are extracted from record bodies and from string values anywhere within `fields` per REL-002, and normalized per REL-003.

Unresolved links do not count toward satisfying composition requirements.

Counts are based on **distinct target record IDs**; repeating the same link target multiple times does not increase the count.

---

## 10. Error reporting requirements

<!-- req:id=ERR-001 title="File-specific errors when possible" -->
### ERR-001 — File-specific errors when possible

Validators/importers MUST report errors with:

* the file path (when applicable), and
* a stable error code, and
* a human-readable message.

<!-- req:id=ERR-002 title="Clear failure categories for GitHub import" -->
### ERR-002 — Clear failure categories for GitHub import

UI MUST differentiate at least:

* invalid URL format
* repo not found (404)
* private/auth required (401/403)
* rate limited (403 + hint)
* dataset invalid (structural/validation errors)

---

## 11. Import from GitHub requirements

<!-- req:id=GH-001 title="Supported URL forms" -->
### GH-001 — Supported URL forms

Import MUST accept:

* `github.com/<owner>/<repo>`
* `https://github.com/<owner>/<repo>`
* `github.com/<owner>/<repo>/tree/<ref>`

<!-- req:id=GH-002 title="Default ref resolution" -->
### GH-002 — Default ref resolution

If no ref is provided, importer MUST use the repository default branch (fallback to `main` if unavailable).

<!-- req:id=GH-003 title="Recursive listing + raw fetch" -->
### GH-003 — Recursive listing + raw fetch

Importer MUST:

* list files recursively via GitHub tree API (`?recursive=1`)
* fetch contents via `raw.githubusercontent.com`

<!-- req:id=GH-005 title="Reject subdirectory URLs" -->
### GH-005 — Reject subdirectory URLs

Importer **MUST** reject URLs that specify a subdirectory after `/tree/<ref>/` and instruct users to import from the repository root.

<!-- req:id=GH-008 title="Public repo import requires no auth" -->
### GH-008 — Public repo import requires no auth

Unauthenticated import from public repositories MUST work for MVP.

---

## 12. Export requirements

Export produces repository snapshots as files (not a JSON/database dump). Graphdown record files remain
Markdown with YAML front matter per §5 and are intended to be tracked in version control.

<!-- req:id=EXP-002 title="Record-only export" -->
### EXP-002 — Record-only export

Export MUST support exporting the Graphdown record subset:

* type records
* all data records

as a zip archive.

<!-- req:id=EXP-003 title="Whole-repo export" -->
### EXP-003 — Whole-repo export

Export MUST support exporting the entire repository snapshot (including non-record files) as a zip archive.

<!-- req:id=EXP-004 title="Path stability" -->
### EXP-004 — Path stability

When exporting records that were imported from specific paths, export MUST preserve those paths (unless the user explicitly relocates records).

<!-- req:id=EXP-005 title="Content preservation (no “reformat the universe”)" -->
### EXP-005 — Content preservation (no “reformat the universe”)

Export MUST NOT rewrite record content merely to “normalize” it, including:

* rewriting wiki-links (§8)
* reformatting YAML keys or changing scalar spellings
* rewrapping strings / changing quotes

Graphdown should only change what the user actually edited.

---

## 13. UI requirements

<!-- req:id=UI-001 title="Desktop + mobile usable" -->
### UI-001 — Desktop + mobile usable

UI shall be usable on desktop and mobile form factors.

<!-- req:id=UI-004 title="Consistent CRUD + relationship affordances" -->
### UI-004 — Consistent CRUD + relationship affordances

UI shall provide consistent affordances for:

* create
* edit
* delete
* link/unlink relationships (Obsidian-style wiki-links)
* navigate to related records

<!-- req:id=NFR-001 title="No full reloads for CRUD" -->
### NFR-001 — No full reloads for CRUD

CRUD operations shall update UI without full page reloads.

<!-- req:id=NFR-010 title="Offline after initial load" -->
### NFR-010 — Offline after initial load

The system shall function offline after initial load.

<!-- req:id=UI-RAW-001 title="Universal raw CRUD fallback (required)" -->
### UI-RAW-001 — Universal raw CRUD fallback (required)

Regardless of schema content, field kinds, or plugins, the UI MUST always be able to:

* display record YAML `fields` in a raw, editable form
* allow copy/paste editing of values as text
* save edits back into Markdown record files

Rich widgets are optional; raw CRUD is mandatory.

---

## 14. Plugin and extensibility requirements

<!-- req:id=NFR-030 title="Plugins must not require core modification" -->
### NFR-030 — Plugins must not require core modification

The system shall be structured so plugins do not require modifying core code.

<!-- req:id=NFR-031 title="New field kinds without rewriting CRUD" -->
### NFR-031 — New field kinds without rewriting CRUD

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

### Type record example with map-shaped `fieldDefs`

```md
---
id: type:ticket
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
