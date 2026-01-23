# GraphMD tests

This directory contains shared test helpers plus centralized integration/spec
tests for the GraphMD dataset library. Unit tests now live alongside their
modules in `src/<area>/__tests__/`.

## Focus areas

- **Spec/integration tests** live under `src/__tests__/spec/` and exercise
  cross-cutting behaviors like validation, layout, hashing, and round-trips.
- **Governance tests** live under `src/__tests__/governance/` and enforce
  spec traceability and coverage.
- **Unit tests** are co-located with the module they cover (for example,
  `src/parse/__tests__/yaml.unit.test.ts` or
  `src/graph/__tests__/graph.unit.test.ts`).

## Fixtures

Tests that load filesystem-backed snapshots use fixtures under
`../__fixtures__/`. See `__fixtures__/README.md` for dataset descriptions.
