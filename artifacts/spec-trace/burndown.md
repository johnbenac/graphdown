# Burndown: SPEC coverage snapshot

Generated: 2026-01-13T06:01:15.482Z
Source: artifacts/spec-trace/matrix.json

## Enforced coverage (CI gate)
- Requirements: 72
- Covered: 72
- Missing: 0
- Coverage: 100.0%

## Deferred backlog (verify in: todo, backlog, deferred, future, planned, manual)
- Requirements: 22
- Covered: 13
- Missing: 9
- Coverage: 59.1%

## Overall (all testable requirements)
- Requirements: 94
- Covered: 85
- Missing: 9
- Coverage: 90.4%

The following DEFERRED requirements have **no referenced tests** (CI does NOT fail):

### EXP (1)
- EXP-PLUG-001 — Canonical plugin export layout

### NR (4)
- NR-PLUG-EXP-001 — Plugins do not define canonical export
- NR-PLUG-HASH-001 — Plugins do not define hashing semantics
- NR-PLUG-LINK-001 — No relationship or CID extraction from plugin files
- NR-PLUG-VAL-001 — No plugin-defined dataset validity rules

### PLUG (3)
- PLUG-000 — Plugins are a first-class dataset object class
- PLUG-FR-001 — Plugin manifest YAML front matter is required
- PLUG-FR-002 — Required top-level keys for plugin manifests

### VAL (1)
- VAL-PLUG-002 — pluginId must be unique

_Rule: use `verify=todo` on a requirement when it is not implemented/verified yet. Promotion = remove `verify=todo` (or set `verify=ci`) + add at least one test title prefixed with the req ID._
