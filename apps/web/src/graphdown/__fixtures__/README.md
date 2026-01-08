# Graphdown fixtures

These fixture datasets are used by unit tests and manual validation of the
Graphdown parsing and validation logic. Each fixture mirrors a small dataset
layout on disk so tests can load them as `DatasetSnapshot` inputs.

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
    `assets/` to ensure round-trip export preserves unrelated files.
  - Records include link references in both YAML fields and markdown body text.

## Notes

- Fixtures are regular text files; do not add binaries here.
- When adding a new fixture, keep the dataset small and focused on a single
  behavior so tests remain easy to read.
