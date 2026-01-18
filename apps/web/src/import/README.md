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
  - Delegates bytes-only parsing and filtering to `@graphdown/io-zip`, which calls the
    shared semantic selector in `@graphdown/io`.

## GitHub imports (`import/github`)

- `parseGitHubUrl.ts`
  - Validates GitHub repository URLs, allowing repo-root or `/tree/<ref>` URLs.
  - Rejects file, issue, or subdirectory URLs with helpful error messages.

- `loadGitHubSnapshot.ts`
  - Uses the GitHub REST API to resolve the default branch, list repository
    files, and download selected files from the raw content endpoint.
  - Streams progress updates through `ImportProgress` phases.
  - Downloads `blocks/**` and Markdown candidates, then delegates semantic selection
    (records + plugin manifests + bundle paths) to `@graphdown/io`.
  - Performs a second fetch pass for any missing plugin bundle files and re-runs selection
    before returning the snapshot.

- `mapGitHubError.ts`
  - Normalizes GitHub API errors into displayable categories (not found,
    auth-required, rate-limited, unknown).
  - Exports `GitHubImportError` so callers can distinguish network issues from
    dataset validation errors.

## Tests

- `github/loadGitHubSnapshot.unit.test.ts`
- `github/loadGitHubSnapshot.plugins.integration.test.ts`
- `github/parseGitHubUrl.unit.test.ts`

These tests cover URL validation and GitHub response handling. Zip parsing tests
live in `packages/io-zip`.
