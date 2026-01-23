# Parsing helpers

`parse/` holds the logic that turns dataset bytes into structured GraphMD
objects. The modules focus on front matter parsing, YAML handling, record/type
validation, and extracting link references.

## Key modules

- `frontMatter.ts`
  - Extracts YAML front matter and body text from markdown files.
  - Normalizes line endings and reassembles records for serialization.
- `yaml.ts`
  - Wraps the `yaml` package with error normalization and object-shape guards.
- `datasetObjects.ts`
  - Detects GraphMD markdown files, parses front matter, validates identifiers
    and top-level keys, and returns `ParsedTypeObject`/`ParsedRecordObject`
    entries.
  - `discoverGraphMDObjects` scans a `DatasetSnapshot` and returns parsed
    objects plus ignored files and errors.
- `markdownRecord.ts`
  - Focused parser/serializer for a single markdown record used in the record
    editor flows.
- `wikiRefs.ts`
  - Extracts record refs (`[[type:record]]`) and block refs (`[[<cid>]]`)
    from string content.

## Usage notes

- Parsing is intentionally strict: unknown top-level keys in YAML front matter
  produce errors so validation can surface actionable feedback.
