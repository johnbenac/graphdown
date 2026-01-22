# Graphdown

Graphdown is a toolkit for **repository-first, Markdown-canonical datasets** defined by the **Graphdown Standard**.

It ships:

- the **standard** (`SPEC.md`) — the single source of truth (currently **Spec v0.5**)
- a **web app** (`apps/web`) for importing/browsing/editing datasets
- a **dataset domain library** (`packages/dataset/src`) for parsing, validation, hashing, canonicalization, and import/export helpers
- a **runtime API** (`packages/runtime`) for session-based dataset reads

> If anything conflicts with `SPEC.md`, `SPEC.md` wins.

---

## What is a Graphdown dataset?

A Graphdown dataset is a **repository of files** (not a database dump).

Graphdown defines **three first-class semantic object classes** in that repository (SPEC v0.5, P-001):

1. **Type objects** and **Record objects** stored as Markdown files with YAML front matter.
2. **Block objects** stored as uninterpreted bytes in the canonical block store (`blocks/…`).
3. **Plugin objects** stored as a plugin manifest plus referenced plugin bundle files.

Everything else in the repository is **non-semantic** and ignored by the dataset layer (BLOCK-LAYOUT-003).

### Content-based discovery (paths don’t matter)

Graphdown is intentionally **path-agnostic** for discovery and identity.

- **Record files** are discovered by content, not directories (LAYOUT-001):
  - file ends in `.md`
  - begins with YAML front matter at byte 0 (`---\n`, `---\r\n`, or `---\r`)
  - parsed YAML contains a `typeId` key

- **Plugin manifest files** are also discovered by content, not directories (PLUG-LAYOUT-001):
  - file ends in `.md`
  - begins with YAML front matter at byte 0
  - parsed YAML is an object/map
  - contains both keys: `pluginId` and `gdApiVersion`
  - **record precedence rule:** if the file contains `typeId` and satisfies LAYOUT-001, it is a record file and MUST NOT be treated as a plugin manifest

---

## Record identity and links (SPEC v0.5)

Records are identified by the pair:

- `typeId` — which type the record belongs to
- `recordId` — the record’s ID within that type

Together they form the globally unique computed identity:

- `recordKey = typeId:recordId`

Record-to-record relationships are expressed using **composite wiki-links**:

- `[[typeId:recordId]]` (REL-001)

Unresolved wiki-links are allowed (NR-LINK-001), but note:
- parent pointers MUST resolve (VAL-PARENT-002)
- unresolved links do not satisfy composition constraints (VAL-COMP-002)

---

## Blocks and CIDs

Blocks are **content-addressed byte blobs** stored in the canonical block store.

- **Canonical path** (BLOCK-LAYOUT-001):

  `blocks/sha2-256/<p>/<cid>`

  where `<p>` is the first byte of the CID digest as two lowercase hex chars, and the filename is the CID string.

- **Block references** inside records and types use CID wiki-link tokens (CID-REF-001):

  `[[<cid>]]`

Dataset validation is strict about CID-shaped tokens:
- CID-shaped tokens that fail DASL CIDv1 decoding are import-failing (`E_CID_INVALID`) (VAL-CID-001)
- referenced blocks must exist and match their CID digest (VAL-BLOCK-001 / VAL-BLOCK-002)

Blocks are **not** hashed directly in dataset fingerprints; they are committed by reference CIDs (HASH-005).

---

## Plugins (SPEC v0.5)

Plugins are a **first-class dataset object class** (PLUG-000).

A dataset:
- MAY have zero or more plugin objects
- MUST remain valid and usable without any plugins present

A **plugin object** consists of:
- a **plugin manifest file** (Markdown + YAML front matter), and
- a set of **plugin bundle files** referenced by the manifest `files[]`.

### Plugin manifest (PLUG-FR-001 / PLUG-FR-002)

A plugin manifest YAML object defines exactly these required keys:

- `pluginId` (string, separator-safe)
- `gdApiVersion` (integer ≥ 1)
- `entry` (string; must be a safe relative path and must appear in `files[]`)
- `files` (array of strings; relative paths)

Optional keys:
- `meta` (object; opaque to core)
- `config` (object; opaque to core)
- `requires` (array of strings; opaque to core)
- `blocks` (array of block CID strings; interpreted by core for reachability + validation)

Forbidden keys (manifests MUST NOT define these):
- `typeId`, `recordId`, `parent`, `fields`

### Bundle file resolution (PLUG-LAYOUT-002)

Bundle files are resolved relative to the **manifest’s directory**:

- root manifest: `resolve(M, p) = p`
- nested manifest: `resolve(M, p) = manifestDir(M) + "/" + p`

### Bundle safety and determinism

Plugin bundle paths MUST be safe relative paths (PLUG-LAYOUT-003), and validation enforces:

- `pluginId` uniqueness (PLUG-ID-002 / VAL-PLUG-002)
- `entry` is safe + included in `files[]` (VAL-PLUG-003)
- `files[]` are safe, exist, are UTF-8 decodable, and don’t point at record/block/manifest files (VAL-PLUG-004 / VAL-PLUG-005)
- `files[]` MUST NOT include `manifest.md` (reserved for canonical export) (VAL-PLUG-006)
- optional `blocks[]` must be valid CIDs and must resolve to matching bytes in the block store (VAL-PLUG-007 / VAL-PLUG-008)

### Plugin non-requirements (core must stay “dumb”)

Core MUST NOT:
- execute or interpret plugin code to determine dataset validity (NR-PLUG-VAL-001)
- extract record relationships or block references from plugin manifest bodies or plugin bundle contents (NR-PLUG-LINK-001)
- allow plugins to modify canonical export semantics (NR-PLUG-EXP-001)
- allow plugins to modify hashing semantics (NR-PLUG-HASH-001)

Plugins affect core semantics only through:
- being validated as plugin objects,
- being included in snapshot hashing,
- being included in canonical export, and
- (optionally) declaring block dependencies via `manifest.blocks[]` for reachability/GC.

---

## Hashing and canonical export

### Hashing (gdhash-v1)

Graphdown defines exactly two standardized dataset fingerprints (HASH-004):

- **schema fingerprint**: type objects only (HASH-002)
- **snapshot fingerprint**: type objects + record objects + plugin objects (HASH-003)

gdhash-v1 hashes **semantic files** only (HASH-001):
- type object record files
- record object record files
- plugin manifests
- plugin bundle files referenced by manifests

Block store files are committed by reference CIDs, not by directly hashing their bytes (HASH-005).

### Canonical dataset export (zip)

Canonical export produces a zip containing exactly (EXP-003):

- all type objects
- all record objects
- all plugin objects (manifest + bundle files)
- all **reachable** block files (GC-001 / EXP-006)

Canonical export MUST:
- lay out types/records using the parent-based deterministic layout (EXP-HIER-001)
- lay out plugins under `plugins/<pluginId>/…` (EXP-PLUG-001)
- exclude non-record, non-plugin, non-block-store files (EXP-003)
- preserve file bytes exactly (no rewrites) except for relocation into canonical paths (EXP-005)

Garbage block files (present but unreferenced) do **not** make a dataset invalid (GC-003), but are excluded from canonical export (GC-002).

---

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

Run core tests:

```sh
npm --workspace packages/dataset run test
```

Run web tests:

```sh
npm --workspace apps/web run test
npm --workspace apps/web run verify
```

Regenerate spec trace artifacts (when editing SPEC requirements):

```sh
npm run spec:trace
```

Development docs:

- [Testing conventions](docs/testing.md)

## Dataset format (minimal examples)

Graphdown distinguishes **type objects**, **record objects**, **blocks**, and **plugins**.

### Type object (FR-MD-021)

A type object is a record file whose YAML contains:

* `typeId` (string)
* `fields` (object/map)

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
* `fields` (object/map)
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

* MUST resolve to an existing record (VAL-PARENT-002)
* MUST be acyclic (VAL-PARENT-003)

Parent pointers are structural. They are not “relationships” under REL-001.

### Block references (CID-REF-001)

Records and types can reference blocks by CID wiki-links:

```md
---
typeId: note
recordId: has-attachment
fields:
  attachment: "[[bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku]]"
---
Body can also reference blocks: [[bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku]]
```

### Plugin manifest (PLUG-FR-002)

A plugin manifest is a Markdown file with YAML front matter like:

```md
---
pluginId: demo
gdApiVersion: 1
entry: entry.js
files:
  - entry.js
  - ui.md
meta:
  displayName: Demo Plugin
blocks:
  - bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku
---

Optional Markdown body describing the plugin.
(Body is opaque to core; it is not scanned for links/CIDs.)
```

Bundle files (`entry.js`, `ui.md`) are resolved relative to the manifest’s directory and are included in hashing and canonical export.

---

## Relationships and “graphs” (terminology)

This codebase contains multiple graph-like structures. In docs, avoid saying “graph” without specifying which one.

* **Record Link Graph**: wiki-link relationships extracted from record bodies and record field strings
* **Record Hierarchy**: parent pointer structure (`parent:`)
* **Type Composition Dependencies**: type → type requirements (`fields.composition`)
* **Block Dependency Graph**: record/type → block CID references (`[[<cid>]]`) plus plugin manifest `blocks[]`
* **Canonical Layout Tree**: deterministic export directory tree (EXP-HIER-001 / EXP-PLUG-001)

See:

* `docs/terminology.md`
* `docs/concepts/graphs.md`
* `docs/concepts/snapshots-and-layout.md`

---

## Example datasets

Reference datasets used for compatibility checks:

* [https://github.com/johnbenac/product-tracker-dataset](https://github.com/johnbenac/product-tracker-dataset)
* [https://github.com/johnbenac/research-lab-dataset](https://github.com/johnbenac/research-lab-dataset)

---

## Repo layout (implementation)

* `SPEC.md` — Graphdown standard (normative)
* `Graphdown_Dataset_Authoring_Guide.md` — authoring guidance (non-normative)
* `apps/web/` — React/Vite web app (import, browse, edit, export)
* `packages/dataset/src/` — dataset parsing/validation/hashing/canonicalization/runtime helpers
* `docs/` — developer concept docs (glossary, graphs, snapshots/layout)
* `artifacts/spec-trace/` — generated spec-to-test traceability artifacts
* `tools/spec-trace.cjs` — spec-trace generator (matrix must match spec; GOV-002)

```
