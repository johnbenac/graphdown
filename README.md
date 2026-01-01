# Graphdown

Graphdown is a toolkit for Markdown-first datasets defined by the Graphdown standard. It ships the spec, a CLI validator, a web app for importing/browsing/editing datasets, and core libraries for working with dataset snapshots.

## What’s inside
- **Spec:** `SPEC.md` (v0.2 draft) is the single source of truth. The older `docs/spec/dataset-validity.md` is a tombstone.
- **CLI validator:** `graphdown validate <datasetPath> [--json|--pretty]` for local paths.
- **Web app:** `apps/web` to import from GitHub or zip, browse/edit records, and export zips.
- **Core library:** utilities for parsing Markdown records, building graphs, validating composition, hashing datasets, and exporting/importing zip snapshots.

## Requirements
- Node.js 20+
- Playwright browsers (for `npm run verify:web`; install with `npm --workspace apps/web run playwright:install`)

## Quick start
- Install deps: `npm ci`

CLI validator:
```bash
npm run build
node dist/cli.js validate ./my-dataset          # pretty (default)
node dist/cli.js validate ./my-dataset --json   # JSON output
# GitHub URLs are rejected; clone first. Use the web app for remote imports.
```

Web app:
```bash
npm run dev:web   # http://localhost:5173
# Import a GitHub repo root or /tree/<ref> URL, or upload a dataset zip.
```

## Validation rules (CLI + web)
- Requires `types/` and `records/`; record files must live under `records/<recordTypeId>/`.
- Records and types must be Markdown with YAML front matter containing `id`, `typeId`, `createdAt`, `updatedAt`, and a `fields` object.
- Type records: `id` must start with `type:`, `typeId` must be `sys:type`, and `fields.recordTypeId` must match `/^[A-Za-z0-9][A-Za-z0-9_-]*$/`. Duplicate `recordTypeId`s and IDs are errors.
- Required fields are derived from `fields.fieldDefs.*.required === true` on type records and enforced on matching data records.
- Composition: types may declare `fields.composition.<name> = { recordTypeId, min?, max? }`. Records must satisfy the min/max counts via wiki-links (`[[id]]`) found in front matter and Markdown bodies. Unknown component types and constraint violations are reported.
- CLI accepts only local paths; GitHub URLs produce `E_GITHUB_URL_UNSUPPORTED` (the web app handles GitHub import).

## Web app capabilities
- Import datasets from GitHub repo roots or `/tree/<ref>` URLs (datasets/, types/, and records/ paths are fetched) or from uploaded zip archives. File/issue/subdirectory URLs are rejected.
- Runs the same validator as the CLI, builds a link graph, and persists the loaded snapshot offline (IndexedDB with in-memory fallback).
- Browse by type, view incoming/outgoing wiki-links, create/edit records using type schemas (`fieldDefs`, `bodyField`), and keep edits in the persisted snapshot.
- Export either the full imported snapshot or dataset-only Markdown (`types/` + `records/`) as zips.

## Dataset layout
```
dataset-root/
├── types/
│   ├── type--<name>.md            # type records (id starts with type:, typeId: sys:type)
└── records/
    ├── <recordTypeId>/
    │   └── <record>.md
```

### Record format (example type record)
```markdown
---
id: "type:example"
typeId: "sys:type"
createdAt: 2025-12-28T00:00:00Z
updatedAt: 2025-12-28T00:00:00Z
fields:
  recordTypeId: "example"
  fieldDefs:
    title:
      kind: "text"
      required: true
  composition:
    related:
      recordTypeId: "example"
      min: 0
---

# Type body (optional)
```

### Record format (example data record)
```markdown
---
id: "example:123"
typeId: "example"
createdAt: 2025-12-28T00:00:00Z
updatedAt: 2025-12-28T00:00:00Z
fields:
  title: "Sample record"
  related: ["[[example:other]]"]
---

Body content with links like [[example:other]].
```

## Snapshots, hashing, and exports
- Snapshots can be loaded from the filesystem or zip (`loadRepoSnapshotFromFs`, `loadRepoSnapshotFromZipBytes/File`).
- Deterministic dataset fingerprints: `computeGdHashV1(snapshot, 'schema' | 'snapshot')` (gdhash-v1) normalize line endings, enforce UTF-8, and error on duplicate IDs.
- Export helpers generate zips for the full snapshot or dataset-only Markdown (`exportWholeRepoZip`, `exportDatasetOnlyZip`).

## Example datasets
- https://github.com/johnbenac/product-tracker-dataset (golden reference)
- https://github.com/johnbenac/research-lab-dataset (golden reference)

## Development
- Run all Node tests: `npm test` (builds first).
- Frontend tests + Playwright E2E: `npm run verify:web` (requires browsers installed).
- Spec tracing: `npm run spec:trace` regenerates `artifacts/spec-trace/matrix.json` from `SPEC.md`.
