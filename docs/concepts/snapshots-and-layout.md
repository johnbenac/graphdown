# Snapshots, File Discovery, and Layout

Graphdown works with datasets as files. Internally, the core uses a snapshot abstraction.

## DatasetSnapshot

A `DatasetSnapshot` is an in-memory map:
- `path: string` -> `bytes: Uint8Array`

It represents “a repository worth of files,” whether loaded from a zip, fetched from GitHub, or created in-memory by tests.

## Record file discovery (LAYOUT-001)

Core does not treat directory names as semantic.

A file is a record file if:
- it ends in `.md`
- it begins with YAML front matter at byte 0 (`---` followed by a line break)
- the parsed YAML object contains a `typeId` key

This behavior is implemented by:
- `packages/core/src/parse/datasetObjects.ts` (`isRecordFileBytes`, `parseGraphdownFile`)

## Type objects vs record objects

After parsing YAML, a record file is classified as:

- Type object: `typeId` + `fields`, and no `recordId`
- Record object: `typeId` + `recordId` + `fields`, optional `parent`

Top-level YAML keys are intentionally strict:
unknown top-level keys produce errors (EXT-001).

## Canonicalization vs validation

### Validation (`validateDatasetSnapshot`)
Validation answers: “Is this snapshot a valid Graphdown dataset?”

It checks:
- parsing errors
- identity uniqueness
- parent pointer integrity
- composition constraints
- block store integrity
- required fields (fieldDefs.required)

### Canonicalization (`canonicalizeDatasetSnapshot`)
Canonicalization answers: “If we export record-only, what should the deterministic paths be?”

It rewrites paths into the canonical record-only layout:
- `types/<typeId>.md`
- `records/<typeId>.<recordId>/.../<recordId>.md` (nested under parents)
- includes only reachable blocks

Canonicalization preserves original file bytes. It changes file paths, not file contents.

## Web app import scope vs core semantics

The Graphdown core can operate on any snapshot and discovers record files by content (LAYOUT-001).

The Graphdown web app importer may choose to include only a subset of repository files when building a snapshot (for performance and UX), as long as **all semantic files needed for validity, hashing, and export are included**.

For example, a valid minimal subset must still include:
- record and type files (`types/**/*.md`, `records/**/*.md`, or any Markdown discovered by content)
- block store files (`blocks/sha2-256/**`)
- plugin manifests (Markdown with plugin front matter)
- **all plugin bundle files referenced by manifests**, including non-Markdown files and binary bundle entries

Filtering out plugin bundle files is not an option: importers must resolve manifests and include every declared bundle file to keep snapshots valid, hashable, and exportable (IMP-PLUG-001).
