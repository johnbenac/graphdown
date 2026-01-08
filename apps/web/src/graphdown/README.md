# Graphdown dataset logic

The `graphdown/` directory contains the dataset parsing, validation, and graph
utilities that back Graphdown. These functions are shared by the import/export
flows, persistence, and record editing features.

## Snapshot model

- `model/snapshotTypes.ts`
  - Defines `DatasetSnapshot`, a map of `path -> Uint8Array` for file contents.
  - Everything in the app reads or writes via this snapshot abstraction.

## Parsing Graphdown markdown

- `parse/frontMatter.ts`
  - Extracts YAML front matter and body text from markdown files.
  - Generates normalized front matter strings when serializing.
- `parse/yaml.ts`
  - Wraps the `yaml` package to parse/serialize YAML objects with consistent
    error messages.
- `parse/datasetObjects.ts`
  - Detects which files are Graphdown markdown records (checks YAML front matter
    sentinel at the start of the file).
  - Parses files into `ParsedTypeObject` and `ParsedRecordObject` shapes.
  - Validates identifiers, record parent values, and top-level allowed keys.
  - Provides `discoverGraphdownObjects` for scanning an entire snapshot.
- `parse/markdownRecord.ts`
  - Focused parser/serializer for a single markdown record file used during
    record edits in the UI.
- `model/types.ts`
  - Shared type helpers and `isObject` guard for runtime validation.

## Validation and canonicalization

- `validate/validateDatasetSnapshot.ts`
  - Validates the dataset against Graphdown rules (layout, identifiers, required
    fields, composition constraints, parent hierarchy, blobs, etc.).
  - Returns a list of `ValidationError` entries with codes and hints for the UI.
- `model/errors.ts`
  - Defines the canonical `ValidationError` codes and builder helper.
- `snapshot/canonicalizeDatasetSnapshot.ts`
  - Rewrites snapshots into canonical layout: types in `types/`, records nested
    under `records/<type>.<id>/`, and only reachable blobs preserved.

## Graph building

- `graph/graph.ts`
  - Converts parsed objects into a graph of type nodes and record nodes.
  - Computes outgoing/incoming link edges using wiki-link references in fields
    and bodies.
  - Exposes lookups used by the dataset browser (types by ID, records by key,
    link lists, etc.).
- `parse/wikiTokens.ts`
  - Extracts record and blob references from `[[...]]` wiki-link tokens.
  - Keeps blob references (`gdblob:sha256-...`) out of record link graphs.
- `model/refs.ts`
  - Normalizes string refs using `cleanId` for consistent record lookups.
- `model/ids.ts`
  - Normalizes identifiers, including stripping surrounding `[[...]]` tokens.

## Export + hashing helpers

- `zip/zipSnapshot.ts`
  - Loads datasets from zip bytes into `DatasetSnapshot`.
  - Exports snapshots to zip with path normalization and `excludeGit` support.
- `zip/buildZip.ts`
  - Thin adapter that exports dataset zip bytes for the web app.
- `model/hash.ts`
  - Computes deterministic hashes for schema-only or full snapshots.
  - Normalizes line endings and sorts by identity for stable hashing.

## Tests

The `graphdown/` folder contains unit tests for parsing and validation,
including `validateDatasetSnapshot.test.ts` and `markdownRecord.test.ts`.
