# Agent Instructions

- Binary files should never be added to any PR.
- All screenshots should be presented directly to the user, and not included in any PRs or commits created.
- Always run tests whenever business logic is touched.

## GitHub URL usage + reference repositories

- GitHub URLs are accepted when importing datasets in the web app: we parse repo-root or `/tree/<ref>` URLs, then fetch Markdown files from `datasets/`, `types/`, and `records/` via the GitHub API. URLs pointing at files, issues, or subdirectories are intentionally rejected.
- The CLI validator accepts only local paths; GitHub URLs are detected and rejected with instructions to clone the repo first.
- Use the following repositories as **golden reference datasets** when reasoning about import/validation compatibility (they are out of scope for changes here, but we must remain compatible with their structure and conventions):
  - https://github.com/johnbenac/research-lab-dataset
  - https://github.com/johnbenac/product-tracker-dataset
