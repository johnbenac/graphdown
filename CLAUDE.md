# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Graphdown is a toolkit for Markdown-first datasets. The repository contains:

- **SPEC.md** — The normative specification (single source of truth)
- **apps/web/** — React/Vite web application for browsing/editing datasets
- **packages/core/src/** — Framework-agnostic core domain library for parsing, validation, hashing, and export/import

**Critical rule**: If anything conflicts with SPEC.md, SPEC.md wins.

## Build and Test Commands

### Root-level commands

```bash
# Install dependencies
npm ci

# Lint core library (packages/core/src only)
npm run lint

# Format all files
npm run format
npm run format:check

# Run all Node.js tests
npm test

# Run core-only checks
npm run check:core-scope
npm run test:core

# Run web-only tests
npm run test:web

# Regenerate spec traceability matrix (after editing SPEC.md requirements)
npm run spec:trace

# Generate burndown report
npm run burndown

# Verify spec test coverage
npm run spec:verify
```

### Web app commands

```bash
# Start dev server (http://localhost:5173)
npm run dev:web

# Build web app for production
npm run build:web

# Run unit tests (Vitest)
npm run test:web

# Run E2E tests (Playwright)
npm run test:web:e2e

# Run all tests (unit + E2E)
npm run verify:web

# Update Playwright snapshots
npm --workspace apps/web run test:e2e:update

# Check test layout structure
npm run check:web:test-layout
```

### Working with specific workspaces

```bash
# Run unit tests in watch mode
npm --workspace apps/web run test

# Install Playwright browsers
npm --workspace apps/web run playwright:install
```

## Code Architecture

### Core Library Structure (packages/core/src/)

The graphdown domain library is **framework-agnostic** and cannot import React or any UI framework code. ESLint enforces this boundary.

Key modules:

- **model/** — TypeScript types and identity normalization
  - `snapshotTypes.ts` — `DatasetSnapshot` (map of path → Uint8Array)
  - `ids.ts`, `refs.ts` — Identifier and reference normalization

- **parse/** — Parsing Graphdown markdown files
  - `frontMatter.ts` — Extract YAML front matter and body
  - `yaml.ts` — Wrapper around yaml package
  - `datasetObjects.ts` — Detect and parse type/record objects from snapshots
  - `markdownRecord.ts` — Single-record parser/serializer for UI edits
- `wikiRefs.ts` — Extract `[[typeId:recordId]]` and CID `[[<cid>]]` references

- **validate/** — Dataset validation against SPEC.md
  - `validateDatasetSnapshot.ts` — Main validation entry point
  - `errors.ts` — Stable error codes

- **graph/** — Record Link Graph building
  - `graph.ts` — Builds in-memory index for type/record lookups and wiki-link adjacency

- **snapshot/** — Snapshot operations
  - `canonicalizeDatasetSnapshot.ts` — Convert to canonical record-only layout
  - `hash.ts` — Compute deterministic schema/snapshot fingerprints (gdhash-v1)

- **zip/** — Import/export helpers
  - `zipSnapshot.ts` — Load/save snapshots as zip archives

### Record Identity Model (SPEC v0.4+)

Records are identified by `(typeId, recordId)`:
- `recordKey = typeId:recordId` (computed, not stored)
- Wiki-links use `[[typeId:recordId]]` syntax
- Parent pointers use string record references: `parent: typeId:recordId`

### Multiple Graph Structures

Avoid saying "graph" without specifying which one:

- **Record Link Graph** — wiki-link relationships (`[[typeId:recordId]]`)
- **Record Hierarchy** — parent pointer structure (`parent:`)
- **Type Composition Dependencies** — type → type requirements (`fields.composition`)
- **Block Dependency Graph** — record → block references (`[[<cid>]]`)
- **Canonical Layout Tree** — deterministic export directory tree (EXP-HIER-001)

See `docs/terminology.md` and `docs/concepts/graphs.md`.

## Spec-Driven Development

### Requirement Traceability

All SPEC.md requirements use this format:

```markdown
<!-- req:id=LAYOUT-001 title="Required directories" testable=true -->
### LAYOUT-001 — Required directories
```

Attributes:
- `testable=false` — governance/manual only; excluded from coverage gates
- `testable=true` — **must** have referenced tests; enforced by CI
- omitted/null — tracked but not gated

### Workflow for Spec Changes

1. Update SPEC.md (normative text)
2. Update or add tests proving the behavior
3. Run `npm run spec:trace` to regenerate `artifacts/spec-trace/matrix.json` and `matrix.md`
4. Commit spec + tests + generated artifacts together

The verification matrix MUST match the committed artifacts (enforced by GOV-002).

## File Layout and Discovery

- **Record files** are discovered by content, not path (LAYOUT-001):
  - Must end in `.md`
  - Must start with YAML front matter (`---` at byte 0)
  - Must have `typeId` in YAML
- **Paths carry no semantic meaning** for validation or hashing
- **Block files** use content-addressed storage: `blocks/sha2-256/<prefix>/<cid>`

## Import Sources

### GitHub Import

The web app accepts GitHub URLs:
- `github.com/owner/repo`
- `github.com/owner/repo/tree/ref`

Subdirectory URLs are intentionally rejected (GH-005).

### Reference Datasets

Use these as golden compatibility references (read-only):
- https://github.com/johnbenac/research-lab-dataset
- https://github.com/johnbenac/product-tracker-dataset

## Testing Strategy

- **Unit tests** — co-located in `src/<area>/__tests__/` and named
  `*.unit.test.ts(x)`.
- **Integration/spec tests** — centralized in `src/__tests__/spec/` and named
  `*.integration.test.ts`.
- **Governance tests** — centralized in `src/__tests__/governance/` and named
  `*.governance.integration.test.ts`.
- **E2E tests** — Playwright tests in `apps/web/e2e/` and named
  `*.e2e.spec.(js|ts)`.
- Run `npm run verify:web` to run web unit + E2E suites.
- Test conventions are checked by `tools/check-test-conventions.js`.

## Development Guidelines

### Core Library Constraints

- **No UI dependencies** — graphdown core cannot import React, react-router-dom, or app-level code
- **Framework-agnostic** — Core must work in any environment (enforced by ESLint)
- **Import from barrel** — App code must import from `@graphdown/core` barrel, not deep paths

### Spec Conformance

- When in doubt, check SPEC.md
- Core behavior must match spec requirements exactly
- Validation errors use stable error codes from `validate/errors.ts`

### Export Behavior

- **Record-only export** (EXP-002) — Types, records, and reachable blobs in canonical layout
- **Whole-repo export** (EXP-003) — Entire snapshot including non-record files
- **Content preservation** (EXP-005) — Do not rewrite user content (links, YAML formatting, etc.)

## Tools and Scripts

- **tools/spec-trace.cjs** — Generate requirement traceability matrix from SPEC.md
- **tools/burndown.js** — Generate progress burndown report
- **tools/check-spec-coverage.js** — Verify all testable requirements have tests
- **tools/check-web-test-layout.js** — Enforce test file organization

## Commit and PR Workflow

From AGENTS.md:
- Never add binary files to PRs
- Screenshots should be presented to users, not committed
- Always run tests when business logic is touched
