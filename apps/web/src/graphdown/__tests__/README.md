# Graphdown tests

This directory contains Vitest unit tests for the Graphdown domain logic. The
suite exercises parsing, validation, hashing, snapshot canonicalization, and
graph building behavior.

## Focus areas

- **Parsing**: YAML/front matter handling, wiki-link extraction, and record/type
  parsing (`frontMatter.test.ts`, `yaml.test.ts`, `markdownRecord.test.ts`,
  `wikiRefs.test.ts`).
- **Validation**: dataset layout rules, identifier constraints, parent
  relationships, composition rules, blocks, and error shapes
  (`validateDatasetSnapshot.test.ts`, `composition.test.ts`, `layout.test.ts`,
  `errors.test.ts`, `blocks.test.ts`).
- **Graph + hashing**: graph link extraction and deterministic hashing
  (`graph.test.ts`, `hash.test.ts`).
- **Utilities**: ID normalization and reserved vocabulary checks
  (`ids.test.ts`, `reserved-vocabulary.test.ts`).
- **Round-trip behaviors**: canonicalization and zip export/import invariants
  (`roundtrip.test.ts`).

## Fixtures

Tests that load filesystem-backed snapshots use fixtures under
`../__fixtures__/`. See `__fixtures__/README.md` for dataset descriptions.
