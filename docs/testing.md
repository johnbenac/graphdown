# Testing conventions

This repository uses explicit naming and layout rules to keep tests organized
and enforce intent.

## Unit tests

- **Location:** co-located with code under `src/**/__tests__/`
- **Naming:** `*.unit.test.ts` or `*.unit.test.tsx`

## Integration/spec tests

- **Location (core):** `packages/core/src/__tests__/spec/`
- **Naming:** `*.integration.test.ts`

## Governance/meta tests

- **Location (core):** `packages/core/src/__tests__/governance/`
- **Naming:** `*.governance.integration.test.ts`

## E2E tests (web)

- **Location:** `apps/web/e2e/`
- **Naming:** `*.e2e.spec.(js|ts)`

## Forbidden patterns

- Playwright specs under `apps/web/src/`
- `*.test.*` files without `.unit.` or `.integration.` in the filename
- Core integration tests outside `packages/core/src/__tests__/spec/`
- Core governance tests outside `packages/core/src/__tests__/governance/`

## Enforcement

Run `node tools/check-test-conventions.js` (wired into CI) to validate these rules.
