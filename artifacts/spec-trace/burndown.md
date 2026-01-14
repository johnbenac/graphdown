# Burndown: SPEC coverage snapshot

Generated: 2026-01-14T06:25:26.570Z
Source: artifacts/spec-trace/matrix.json

## Enforced coverage (CI gate)
- Requirements: 75
- Covered: 75
- Missing: 0
- Coverage: 100.0%

## Deferred backlog (verify in: todo, backlog, deferred, future, planned, manual)
- Requirements: 19
- Covered: 15
- Missing: 4
- Coverage: 78.9%

## Overall (all testable requirements)
- Requirements: 94
- Covered: 90
- Missing: 4
- Coverage: 95.7%

The following DEFERRED requirements have **no referenced tests** (CI does NOT fail):

### NR (4)
- NR-PLUG-EXP-001 — Plugins do not define canonical export
- NR-PLUG-HASH-001 — Plugins do not define hashing semantics
- NR-PLUG-LINK-001 — No relationship or CID extraction from plugin files
- NR-PLUG-VAL-001 — No plugin-defined dataset validity rules

_Rule: use `verify=todo` on a requirement when it is not implemented/verified yet. Promotion = remove `verify=todo` (or set `verify=ci`) + add at least one test title prefixed with the req ID._
