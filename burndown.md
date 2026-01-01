# Burndown: SPEC coverage snapshot

Generated: 2026-01-01T05:35:27.934Z
Source: artifacts/spec-trace/matrix.json

- Requirements: 62
- Covered: 36
- Missing: 26
- Coverage: 58.1%

The following requirements currently have **no referenced tests**:

## EXP (1)
- EXP-001 — Export is Markdown repositories

## EXT (2)
- EXT-001 — Minimal reserved vocabulary
- EXT-002 — `fields` is open

## GOV (1)
- GOV-001 — Spec-first changes

## HASH (1)
- HASH-004 — No records-only fingerprint in core

## NFR (4)
- NFR-001 — No full reloads for CRUD
- NFR-010 — Offline after initial load
- NFR-030 — Plugins must not require core modification
- NFR-031 — New field kinds without rewriting CRUD

## NR (5)
- NR-LINK-001 — No requirement that links resolve
- NR-SEC-001 — No security hardening requirement
- NR-SEM-001 — No semantic value typing in core
- NR-UI-001 — No standardized UI hints
- NR-UI-002 — Core must not interpret UI hints

## P (3)
- P-001 — Repository-first, Markdown-canonical
- P-002 — Dataset defines the model
- P-003 — Universality and minimal assumptions

## REL (2)
- REL-004 — Preservation: do not rewrite link spellings
- REL-005 — Creating links in Graphdown-authored edits

## TYPE (3)
- TYPE-005 — Field definition minimum shape
- TYPE-006 — Open world field kinds
- TYPE-007 — Body semantics: `bodyField` (optional)

## UI (3)
- UI-001 — Desktop + mobile usable
- UI-004 — Consistent CRUD + relationship affordances
- UI-RAW-001 — Universal raw CRUD fallback (required)

## VAL (1)
- VAL-006 — No semantic validation of values

_Tip: add `testable=` / `verify=` metadata in SPEC.md when ready to gate coverage._