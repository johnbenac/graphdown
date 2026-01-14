# Graphdown tests

This directory contains shared test utilities plus the centralized integration
and governance suites for the Graphdown core library.

## Focus areas

- **Integration/spec tests** live in `__tests__/spec/` and exercise black-box
  behavior (dataset validation, layout rules, plugin behaviors, roundtrips).
- **Governance tests** live in `__tests__/governance/` and cover spec traceability
  and meta-level checks.
- **Unit tests** are co-located next to modules under `src/**/__tests__/`.

## Fixtures

Tests that load filesystem-backed snapshots use fixtures under
`../__fixtures__/`. See `__fixtures__/README.md` for dataset descriptions.
