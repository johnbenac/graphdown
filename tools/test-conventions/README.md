# Test Conventions Configuration

This directory contains configuration for the test conventions checker (`tools/check-test-conventions.js`).

## Configuration File

**File:** `config.json`

### Schema

```json
{
  "version": 1,
  "description": "Human-readable description",
  "colocationAllowlist": {
    "packageName": {
      "areaName": {
        "reason": "Why this area is exempt from requiring co-located tests",
        "issue": "GitHub issue tracking remediation (e.g., GH-1234 or https://...)",
        "owner": "Team or individual responsible (e.g., @graphdown/dataset)",
        "expires": "YYYY-MM-DD when this exception should be reviewed/removed"
      }
    }
  }
}
```

### Example

```json
{
  "version": 1,
  "colocationAllowlist": {
    "core": {
      "internal": {
        "reason": "Low-risk helpers; covered via integration tests in validate/ + parse/",
        "issue": "GH-1234",
        "owner": "@graphdown/dataset",
        "expires": "2026-06-01"
      },
      "zip": {
        "reason": "Temporary exception while zip tests are added",
        "issue": "GH-1235",
        "owner": "@graphdown/dataset",
        "expires": "2026-02-15"
      }
    }
  }
}
```

## Allowlist Metadata Requirements

All allowlist entries **must** include:

- **`reason`** - Clear explanation of why the exception exists
- **`issue`** - GitHub issue URL or issue number tracking remediation
- **`owner`** - Team or individual responsible for addressing the exception
- **`expires`** - Date (YYYY-MM-DD) when the exception should be reviewed

### Expiration Behavior

When an allowlist entry expires:
- The checker will **fail** with a clear error message
- The entry must be either:
  - Removed (if tests have been added)
  - Extended with an updated expiration date and justification
  - Converted to a permanent exception (use far-future date like 2099-12-31)

This ensures allowlist exceptions are tracked as technical debt and reviewed regularly.

## Removing Exceptions

When an area gains co-located tests, remove its allowlist entry entirely. The checker will detect if an allowlisted area now has tests and warn that the exception can be removed.

## Environment Variables

### `GD_TEST_CONVENTIONS_CONFIG`

Override the config file location:

```bash
GD_TEST_CONVENTIONS_CONFIG=/path/to/custom-config.json node tools/check-test-conventions.js
```

### `GD_TEST_CONVENTIONS_REPORT_PATH`

Write JSON violations report to a specific path (useful for CI):

```bash
GD_TEST_CONVENTIONS_REPORT_PATH=test-results/violations.json node tools/check-test-conventions.js
```

In CI, defaults to `test-results/test-conventions/violations.json` if not set.

## CODEOWNERS

This configuration is protected by CODEOWNERS to ensure allowlist changes require approval:

```
/tools/check-test-conventions.js           @graphdown/maintainers
/tools/test-conventions/config.json        @graphdown/maintainers
```

Any changes to the checker or allowlist require maintainer approval.
