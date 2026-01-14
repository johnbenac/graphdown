# Graphdown core tests

This folder hosts shared test utilities plus centralized spec/governance suites.
Most **unit tests are now co-located** with their module under
`src/<module>/__tests__/`.

## Test layout

- **Unit tests**: `src/<module>/__tests__/*.unit.test.ts`
- **Spec/integration tests**: `src/__tests__/spec/*.integration.test.ts`
- **Governance tests**: `src/__tests__/governance/*.governance.integration.test.ts`

## Shared helpers

`fixtureLoader.ts` lives here to keep a stable relative path to `../__fixtures__/`.
Unit and spec tests can import it via:

```ts
import { loadFixtureSnapshot } from "../../__tests__/fixtureLoader";
```

## Fixtures

Tests that load filesystem-backed snapshots use fixtures under `../__fixtures__/`.
See `__fixtures__/README.md` for dataset descriptions.
