# Import helpers

The import layer ingests datasets from zip files or GitHub repositories and returns:

- a `DatasetSnapshot` (files as `Uint8Array` bytes)
- a list of ignored files (for reporting)

## Important: import scope vs core semantics

The Graphdown core discovers record files by **content** (SPEC: LAYOUT-001) and ignores non-record/non-block-store files for semantics (BLOCK-LAYOUT-003).

The **web app importer** may choose to load only a subset of repository files for UX/performance. This is an application choice, not a dataset validity rule.

## Zip imports

- `readZipSnapshot.ts`
  - Reads a user-selected zip file via `File.arrayBuffer()`.
  - Normalizes entry paths to prevent path traversal or invalid paths.
  - Supports stripping a single root directory when the zip is packaged with a
    top-level folder.
  - Filters entries to files relevant to the web app import flow:
    - `types/**/*.md`
    - `records/**/*.md`
    - `blocks/sha2-256/**`
  - Returns both the filtered snapshot and a list of ignored files.

## GitHub imports (`import/github`)

- `parseGitHubUrl.ts`
  - Validates GitHub repository URLs, allowing repo-root or `/tree/<ref>` URLs.
  - Rejects file, issue, or subdirectory URLs with helpful error messages.

- `loadGitHubSnapshot.ts`
  - Uses the GitHub REST API to resolve the default branch, list repository
    files, and download selected files from the raw content endpoint.
  - Streams progress updates through `ImportProgress` phases.

- `mapGitHubError.ts`
  - Normalizes GitHub API errors into displayable categories (not found,
    auth-required, rate-limited, unknown).
  - Exports `GitHubImportError` so callers can distinguish network issues from
    dataset validation errors.

## Tests

- `readZipSnapshot.test.ts`
- `github/loadGitHubSnapshot.test.ts`
- `github/parseGitHubUrl.test.ts`

These tests cover zip parsing, URL validation, and GitHub response handling.
