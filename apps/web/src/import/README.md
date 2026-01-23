# Import helpers

The import layer ingests datasets from zip files or GitHub repositories and returns:

- a `DatasetSnapshot` (files as `Uint8Array` bytes)
- a list of ignored files (for reporting)

## Important: import scope vs core semantics

The GraphMD core discovers record files by **content** (SPEC: LAYOUT-001) and ignores non-record/non-block-store files for semantics (BLOCK-LAYOUT-003).

The **web app importer** may choose to load only a subset of repository files for UX/performance, but it must include all semantic files required for validity, hashing, and export (records, types, plugin manifests + bundle files, and referenced blocks).

## Zip imports

- `readZipSnapshot.ts`
  - Reads a user-selected zip file via `File.arrayBuffer()`.
  - Delegates bytes-only parsing and filtering to `@graphmd/io-zip`, which
    applies shared semantic selection from `@graphmd/io`.

## GitHub imports (`@graphmd/io-github`)

- GitHub imports are implemented in `@graphmd/io-github` (transport-only) and
  consumed by the web app before continuing the session pipeline.

- `parseGitHubUrl`
  - Validates GitHub repository URLs, allowing repo-root or `/tree/<ref>` URLs.
  - Rejects file, issue, or subdirectory URLs with helpful error messages.

- `loadGitHubSnapshot`
  - Uses the GitHub REST API to resolve the default branch, list repository
    files, and download selected files from the raw content endpoint.
  - Streams progress updates through `ImportProgress` phases.
  - Downloads `blocks/**` and all Markdown files, then delegates semantic
    selection (records, plugin manifests, bundle files) to `@graphmd/io`.
  - Runs a second fetch pass for missing plugin bundles before returning the
    final semantic snapshot.

- `mapGitHubError`
  - Normalizes GitHub API errors into shared import error codes (not found,
    auth-required, rate-limited, unknown).
  - Exports `GitHubImportError` as a thin wrapper over the shared import error
    class so callers can distinguish structured import failures.

## Tests

- `packages/io-github/src/__tests__/loadGitHubSnapshot.unit.test.ts`
- `packages/io-github/src/__tests__/spec/loadGitHubSnapshot.plugins.integration.test.ts`
- `packages/io-github/src/__tests__/parseGitHubUrl.unit.test.ts`

These tests cover URL validation and GitHub response handling. Zip parsing tests
live in `packages/io-zip`.
