# Graphdown core tests

This directory contains shared test utilities plus centralized integration/spec
and governance suites for the core package.

## Structure

- **Unit tests** live next to their modules in `src/**/__tests__/` and are named
  `*.unit.test.ts`.
- **Integration/spec tests** live in `src/__tests__/spec/` and are named
  `*.integration.test.ts`.
- **Governance tests** live in `src/__tests__/governance/` and are named
  `*.governance.integration.test.ts`.

## Utilities

- `fixtureLoader.ts` stays here so fixture paths remain stable for any tests
  that read from `src/__fixtures__/`.

## Fixtures

Tests that load filesystem-backed snapshots use fixtures under
`../__fixtures__/`. See `__fixtures__/README.md` for dataset descriptions.
