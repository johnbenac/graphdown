# Graphdown domain logic

The core package `src/` directory contains dataset parsing, validation, hashing, link extraction, and snapshot utilities shared by the import/export flows, persistence, and record editing features.

## Vocabulary (important)

This codebase contains multiple graph-like structures. In docs, avoid saying “graph” without specifying which one.

- **Record Link Graph** — wiki-link relationships between records (`[[typeId:recordId]]`)
- **Record Hierarchy** — structural parent pointers (`parent:`)
- **Type Composition Dependencies** — type → type requirements (`fields.composition`)
- **Block Dependency Graph** — record → block references (`[[<cid>]]`)
- **Canonical Layout Tree** — deterministic filesystem layout for record-only exports

See `docs/terminology.md` and `docs/concepts/graphs.md`.

## Model

- `model/snapshotTypes.ts`
  - Defines `DatasetSnapshot`, a map of `path -> Uint8Array` for file contents.
- `model/types.ts`
  - Shared helpers including the `isObject` guard.
- `model/ids.ts` / `model/refs.ts`
  - Normalizes identifiers and reference IDs for consistent lookups.

## Parsing Graphdown markdown

- `parse/frontMatter.ts`
  - Extracts YAML front matter and body text from markdown files.
- `parse/yaml.ts`
  - Wraps the `yaml` package to parse/serialize YAML objects with consistent error messages.
- `parse/datasetObjects.ts`
  - Detects which files are Graphdown markdown records (checks YAML front matter sentinel at the start of the file).
  - Parses files into `ParsedTypeObject` and `ParsedRecordObject` shapes.
  - Validates identifiers, record parent values, and top-level allowed keys.
  - Provides `discoverGraphdownObjects` for scanning an entire snapshot.
- `parse/markdownRecord.ts`
  - Focused parser/serializer for a single markdown record file used during record edits in the UI.
- `parse/wikiRefs.ts`
  - Extracts record refs (`[[typeId:recordId]]`) and block refs (`[[<cid>]]`) from string content.

## Validation and canonicalization

- `validate/validateDatasetSnapshot.ts`
  - Validates dataset structure: identifiers, uniqueness, type existence, required fields, composition constraints, parent hierarchy, and block integrity.
- `validate/errors.ts`
  - Defines stable `ValidationError` codes.
- `snapshot/canonicalizeDatasetSnapshot.ts`
  - Rewrites snapshots into canonical record-only layout and keeps only reachable blocks.

## Record Link Graph building (for UI relationships)

- `graph/graph.ts`
  - Builds the **Record Link Graph** index:
    - type + record lookups
    - incoming/outgoing record-link adjacency based on wiki-links in record body + record field strings

## Zip + hashing helpers

- `zip/zipSnapshot.ts`
  - Loads snapshots from zip bytes with path normalization.
  - Exports snapshots to zip with deterministic ordering.
- `snapshot/hash.ts`
  - Computes deterministic hashes for schema-only or full snapshots.

## Tests

The core package contains unit tests for parsing and validation, including `validateDatasetSnapshot.test.ts` and `markdownRecord.test.ts`.
