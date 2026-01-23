# Agent Instructions

- Binary files should never be added to any PR.
- All screenshots should be presented directly to the user, and not included in any PRs or commits created.
- Always run tests whenever business logic is touched.
- Before finishing any change, verify that relevant GitHub Actions workflows still pass or would pass: run the appropriate local checks that map to CI to avoid breaking the action matrix, and call out any CI gaps or limitations explicitly.
- Treat CI stability as a first-class requirement: our actions cover many scenarios, so changes should be validated against the same checks to protect the repository from CI regressions.

## Workspace Dependency Format

**CRITICAL**: This repository uses npm (not pnpm). Workspace dependencies MUST use version format, not protocol format.

### Correct Format

```json
{
  "dependencies": {
    "@graphmd/package-name": "0.0.0"
  },
  "devDependencies": {
    "@graphmd/other-package": "0.0.0"
  }
}
```

### Incorrect Format (DO NOT USE)

```json
{
  "dependencies": {
    "@graphmd/package-name": "workspace:*"  // ❌ WRONG - pnpm only
  }
}
```

### Why This Matters

- The `workspace:*` protocol is **pnpm-specific** and not supported by npm
- Using it causes `npm ci` to fail with: `npm error code EUNSUPPORTEDPROTOCOL`
- This breaks all CI builds immediately

### Before Adding Any Workspace Dependency

1. Check existing packages for the pattern:
```bash
# See how other packages declare workspace deps
cat packages/persistence/package.json | grep "@graphmd"
cat packages/io/package.json | grep "@graphmd"
cat packages/app-kit/package.json | grep "@graphmd"
```

2. Always use `"0.0.0"` as the version string

3. Verify before committing:
```bash
# This MUST return nothing
grep -r "workspace:" packages/*/package.json apps/*/package.json

# If it finds "workspace:", fix it before proceeding
```

### Quick Reference

**Adding a new workspace package dependency:**
```bash
# In the consuming package's package.json, add:
"@graphmd/new-package": "0.0.0"

# Then from repo root:
npm install
```

**Verification that dependencies are correct:**
```bash
# Must succeed without EUNSUPPORTEDPROTOCOL
npm ci
```

See `package-lock.json` lockfileVersion (currently v3) which confirms npm usage.

## GitHub URL usage + reference repositories

- GitHub URLs are accepted when importing datasets in the web app: we parse repo-root or `/tree/<ref>` URLs, then fetch Markdown files from `datasets/`, `types/`, and `records/` via the GitHub API. URLs pointing at files, issues, or subdirectories are intentionally rejected.
- The CLI validator accepts only local paths; GitHub URLs are detected and rejected with instructions to clone the repo first.
- Use the following repositories as **golden reference datasets** when reasoning about import/validation compatibility (they are out of scope for changes here, but we must remain compatible with their structure and conventions):
  - https://github.com/johnbenac/research-lab-dataset
  - https://github.com/johnbenac/product-tracker-dataset

## Compiling Files for Context Sharing

Use `big_picture` to compile multiple files into a single output for sharing context with others or for AI assistance.

### Basic Usage

```bash
# Compile files with descriptive headings
big_picture -f \
  "path/to/file1.ts:Description of file1" \
  "path/to/file2.ts:Description of file2" \
  -o output.txt

# Default: no system info (cleaner for code review)
big_picture -f \
  "src/main.ts:Main application logic" \
  "src/utils.ts:Helper functions" \
  -o context.txt

# Include system info when sharing with others
big_picture -f \
  "src/main.ts:Main application logic" \
  "src/utils.ts:Helper functions" \
  --system-info -o context-with-env.txt
```

### Common Patterns

```bash
# Feature overview
big_picture -f \
  "packages/core/src/parse/*.ts:Parsing modules" \
  "packages/core/src/validate/*.ts:Validation modules" \
  -o feature-context.txt

# Debug context
big_picture -f \
  "src/problematic-module.ts:Where error occurs" \
  "src/caller.ts:What calls the module" \
  "src/config.ts:Configuration" \
  -o debug-context.txt

# Architecture overview
big_picture -f packages/core/src/**/*.ts -o architecture.txt
```