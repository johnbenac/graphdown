# Import helpers

The import layer ingests datasets from zip files or GitHub repositories and returns:

- a `DatasetSnapshot` (files as `Uint8Array` bytes)
- a list of ignored files (for reporting)

## Important: import scope vs core semantics

The Graphdown core discovers record files by **content** (SPEC: LAYOUT-001) and ignores non-record/non-block-store files for semantics (BLOCK-LAYOUT-003).

The **web app importer** may choose to load only a subset of repository files for UX/performance, but it must include all semantic files required for validity, hashing, and export (records, types, plugin manifests + bundle files, and referenced blocks).

## Zip imports

- `readZipSnapshot.ts`
  - Reads a user-selected zip file via `File.arrayBuffer()`.
  - Delegates bytes-only parsing and filtering to `@graphdown/io-zip`, which
    applies shared semantic selection from `@graphdown/io`.

## GitHub imports (`@graphdown/io-github`)

GitHub repository transport logic lives in `@graphdown/io-github`. The web app
delegates URL parsing and snapshot loading to the package, then continues with
the session pipeline (validation, runtime, persistence, and UI reporting).

## Tests

- `packages/io-github/src/__tests__/loadGitHubSnapshot.unit.test.ts`
- `packages/io-github/src/__tests__/spec/loadGitHubSnapshot.plugins.integration.test.ts`
- `packages/io-github/src/__tests__/parseGitHubUrl.unit.test.ts`

These tests cover URL validation and GitHub response handling. Zip parsing tests
live in `packages/io-zip`.
