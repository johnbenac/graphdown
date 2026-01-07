# Import helpers

The import layer is responsible for ingesting datasets from zip files or GitHub
repositories, filtering files to the Graphdown dataset layout, and returning a
`DatasetSnapshot` plus a list of ignored files.

## Zip imports

- `readZipSnapshot.ts`
  - Reads a user-selected zip file via `File.arrayBuffer()`.
  - Normalizes entry paths to prevent path traversal or invalid paths.
  - Supports stripping a single root directory when the zip is packaged with a
    top-level folder.
  - Filters entries to dataset-relevant files:
    - `types/**/*.md`
    - `records/**/*.md`
    - `blobs/sha256/**`
  - Returns both the filtered snapshot and a list of ignored files.

## GitHub imports (`import/github`)

- `parseGitHubUrl.ts`
  - Validates GitHub repository URLs, allowing repo-root or `/tree/<ref>` URLs.
  - Rejects file, issue, or subdirectory URLs with helpful error messages.
- `loadGitHubSnapshot.ts`
  - Uses the GitHub REST API to resolve the default branch, list repository
    files, and download dataset files from the raw content endpoint.
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
