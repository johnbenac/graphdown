# Testing conventions

This repo enforces test layout and naming conventions to keep suites predictable and
ensure CI checks stay aligned with intent. The conventions are enforced by
`tools/check-test-conventions.js`.

## Unit tests

**Purpose:** Tests focused on a single module or feature area.

**Core library**

- **Location:** `packages/core/src/<module>/__tests__/`
- **Naming:** `*.unit.test.ts`

**Web app**

- **Location:** `apps/web/src/**/__tests__/`
- **Naming:** `*.unit.test.ts` or `*.unit.test.tsx`

## Integration/spec tests

**Purpose:** Cross-cutting behavior tests that treat a package as a system
(filesystem layout rules, dataset validity, plugin behavior across multiple
modules, round-trips, etc.).

**Core library**

- **Location:** `packages/core/src/__tests__/spec/`
- **Naming:** `*.integration.test.ts`

**Web app**

- **Location:** `apps/web/src/**/__tests__/`
- **Naming:** `*.integration.test.ts` or `*.integration.test.tsx`
- **Optional NFR variant:** `*.nfr.integration.test.tsx` (for non-functional
  requirements like perf guards)

## Governance tests

**Purpose:** CI/spec-trace, policy matrix, and other “tests about tests/spec coverage”.

- **Location:** `packages/core/src/__tests__/governance/`
- **Naming:** `*.governance.integration.test.ts`

## End-to-end (E2E) tests

**Purpose:** Browser-level full user flows.

- **Location:** `apps/web/e2e/`
- **Naming:** `*.e2e.spec.(js|ts)`

## Forbidden patterns

- No Playwright specs under `apps/web/src/`.
- No `*.test.*` files without `.unit.` or `.integration.` in the filename.
- No tests outside of `__tests__` directories (except `apps/web/e2e/`).

## Enforcement

Run the convention checks locally:

```bash
npm run check:test-conventions
```
