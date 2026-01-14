# Testing conventions

This repository enforces test **location** and **naming** conventions to keep unit, integration, governance, and E2E suites distinct and discoverable.

## Unit tests

**Purpose:** Tests of a single module/component/feature folder.

**Location:** Co-located with code under a `__tests__` directory:

```
src/<area>/__tests__/
```

**Naming:**

```
*.unit.test.ts
*.unit.test.tsx
```

## Integration/spec tests (core)

**Purpose:** Cross-cutting, black-box tests that treat the core library as a system.

**Location:**

```
packages/core/src/__tests__/spec/
```

**Naming:**

```
*.integration.test.ts
```

## Governance/meta tests (core)

**Purpose:** Spec traceability, coverage, and other “tests about tests.”

**Location:**

```
packages/core/src/__tests__/governance/
```

**Naming:**

```
*.governance.integration.test.ts
```

## E2E tests (web)

**Purpose:** Browser-level full flows.

**Location:**

```
apps/web/e2e/
```

**Naming:**

```
*.e2e.spec.js
*.e2e.spec.ts
```

## Forbidden patterns (repo-wide)

- No Playwright `*.spec.*` files under `apps/web/src/`.
- No `*.test.*` files that lack `.unit.` or `.integration.` in the filename.

## Enforcement

Conventions are enforced by:

```
node tools/check-test-conventions.js
```

This runs in CI and should be run locally before pushing changes that add or rename tests.
