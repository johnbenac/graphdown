# Import helpers

The import layer ingests datasets from zip files or GitHub repositories and returns:

- a `DatasetSnapshot` (files as `Uint8Array` bytes)
- a list of ignored files (for reporting)

## Important: import scope vs core semantics

The Graphdown core discovers record files by **content** (SPEC: LAYOUT-001) and ignores non-record/non-block-store files for semantics (BLOCK-LAYOUT-003).

The **web app importer** may choose to load only a subset of repository files for UX/performance, but it must still include all semantic files required for validity, hashing, and export. Plugin objects are first-class: importers must include plugin manifests and all resolved bundle files referenced by those manifests (including declared binary files).

## Zip imports

- `readZipSnapshot.ts`
  - Reads a user-selected zip file via `File.arrayBuffer()`.
  - Normalizes entry paths to prevent path traversal or invalid paths.
  - Supports stripping a single root directory when the zip is packaged with a
    top-level folder.
  - Filters entries to files relevant to the web app import flow:
    - `blocks/**`
    - Markdown files anywhere that start with a YAML front matter delimiter at byte 0
      (the same check used by `isRecordFileBytes`).
  - Resolves plugin manifests, then pulls in all referenced bundle files (including
    non-markdown and binary entries).
  - Ignores non-block files that do not match the Graphdown markdown sentinel and are
    not referenced by a plugin manifest.
  - Returns both the filtered snapshot and a list of ignored files.

## GitHub imports (`import/github`)

- `parseGitHubUrl.ts`
  - Validates GitHub repository URLs, allowing repo-root or `/tree/<ref>` URLs.
  - Rejects file, issue, or subdirectory URLs with helpful error messages.

- `loadGitHubSnapshot.ts`
  - Uses the GitHub REST API to resolve the default branch, list repository
    files, and download selected files from the raw content endpoint.
  - Streams progress updates through `ImportProgress` phases.
  - Downloads `blocks/**` and all Markdown files, retaining Markdown only when
    `isRecordFileBytes` confirms Graphdown front matter.
  - Resolves plugin manifests, then fetches all referenced bundle files (including
    non-markdown and binary entries) as a second pass.

- `mapGitHubError.ts`
  - Normalizes GitHub API errors into displayable categories (not found,
    auth-required, rate-limited, unknown).
  - Exports `GitHubImportError` so callers can distinguish network issues from
    dataset validation errors.

## Tests

- `readZipSnapshot.unit.test.ts`
- `readZipSnapshot.plugins.integration.test.ts`
- `github/loadGitHubSnapshot.unit.test.ts`
- `github/loadGitHubSnapshot.plugins.integration.test.ts`
- `github/parseGitHubUrl.unit.test.ts`

These tests cover zip parsing, URL validation, and GitHub response handling.
