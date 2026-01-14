# Graphdown fixtures

These fixture datasets are used by unit tests and manual validation of the
Graphdown parsing and validation logic. Each fixture mirrors a small dataset
layout on disk so tests can load them as `DatasetSnapshot` inputs.

All fixtures must conform to SPEC.md v0.5, especially the strict top-level
key requirements for types and records.

## Fixture sets

- `valid-dataset/`
  - Minimal, well-formed dataset used for sanity checks.
  - Contains one type (`types/type--note.md`) and one record
    (`records/note/record--1.md`).
- `invalid-dataset/`
  - Intentionally invalid record payloads used by error/validation tests.
  - Includes `invalid.md` with a `fields` value that is not an object.
- `graph-dataset/`
  - Simple dataset with two note records that link to each other using
    `[[note:<id>]]` references.
  - Used to exercise graph-link extraction behavior and link directionality.
- `roundtrip-repo/`
  - Dataset with nested `types/` and `records/` paths plus an extra file under
    `assets/` to ensure ignored files are ignored by validation and export.
  - Records include link references in both YAML fields and markdown body text.
- `frontmatter-permissive-dataset/`
  - Valid dataset with extra Markdown files that start with YAML front matter
    (including invalid/unterminated YAML) to validate LAYOUT-003 behavior.

## Plugin fixtures (SPEC v0.5)

- `plugin-valid-dataset/`
  - Valid plugin manifest + UTF-8 bundle files.
  - Includes an empty-bytes block file using CID-001 for later plugin block
    reachability/export tests.
- `plugin-bundle-bad-frontmatter/`
  - Valid plugin manifest that bundles a Markdown file with broken YAML front
    matter to ensure plugin bundles are hashed/exported regardless of YAML
    validity.

- `plugin-invalid-duplicate-pluginId/`
  - Two manifests share the same `pluginId` (to exercise PLUG-ID-002 /
    VAL-PLUG-002 later).

- `plugin-invalid-entry-not-in-files/`
  - `entry` exists but is not listed in `files[]` (VAL-PLUG-003 later).

- `plugin-invalid-reserved-manifest-path/`
  - `files[]` contains `manifest.md` (VAL-PLUG-006 later).

- `plugin-invalid-unsafe-relative-path/`
  - `entry` and `files[]` contain `..` segments (PLUG-LAYOUT-003 /
    VAL-PLUG-004 later).

## Notes

- Fixtures are regular text files; do not add binaries here.
- When adding a new fixture, keep the dataset small and focused on a single
  behavior so tests remain easy to read.
