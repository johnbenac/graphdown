# Burndown: SPEC coverage snapshot

Generated: 2026-01-05T05:21:39.017Z
Source: artifacts/spec-trace/matrix.json

- Requirements (testable): 67
- Covered: 58
- Missing: 9
- Coverage: 86.6%

The following requirements currently have **no referenced tests**:

## ERR (1)
- ERR-001 — File-specific errors when possible

## EXP (6)
- EXP-002 — Record-only export
- EXP-003 — Whole-repo export
- EXP-004 — Path stability
- EXP-005 — Content preservation (no “reformat the universe”)
- EXP-006 — Record-only export includes reachable blobs
- EXP-HIER-001 — Canonical parent-based export layout

## GC (2)
- GC-001 — Reachable blob set is computed from blob references
- GC-002 — Unreferenced blobs are garbage and are excluded from record-only export

_Tip: add `testable=` / `verify=` metadata in SPEC.md when ready to gate coverage._
