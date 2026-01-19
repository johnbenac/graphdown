# Testing conventions

This document defines repository-wide test layout and naming rules. The
conventions are enforced by `tools/check-test-conventions.js` and CI.

## Unit tests

**Purpose:** Tests for a single module/component/feature folder.

**Location:** Co-located with code in a `__tests__` directory:

- `src/<area>/__tests__/...`

**Naming:** `*.unit.test.ts` / `*.unit.test.tsx`

## Integration/spec tests

**Purpose:** Cross-cutting system tests (filesystem layout rules, dataset
validity, plugin behavior across modules, roundtrips, etc.).

**Location:** Centralized per package/app:

- `src/__tests__/spec/`

**Naming:** `*.integration.test.ts`

## Cross-package integration tests

Cross-package integration tests that do not clearly “belong” to a single package/app live in:

- `packages/integration-tests/src/__tests__/spec/`

These tests must be named `*.integration.test.ts`.

## Governance tests

**Purpose:** Spec traceability and policy/meta tests.

**Location:**

- `src/__tests__/governance/`

**Naming:** `*.governance.integration.test.ts`

## E2E tests

**Purpose:** Browser-level full flows.

**Location:**

- `apps/web/e2e/`

**Naming:** `*.e2e.spec.(js|ts)`

## Forbidden patterns

- No Playwright specs under `apps/web/src/`.
- No `*.test.*` files without `.unit.` or `.integration.` in the filename.
- No integration/spec tests outside `src/__tests__/spec/`.
- No governance tests outside `src/__tests__/governance/`.
