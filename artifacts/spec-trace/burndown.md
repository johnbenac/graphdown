# Burndown: SPEC coverage snapshot

Generated: 2026-01-13T03:47:10.489Z
Source: artifacts/spec-trace/matrix.json

## Enforced coverage (CI gate)
- Requirements: 72
- Covered: 72
- Missing: 0
- Coverage: 100.0%

## Deferred backlog (verify in: todo, backlog, deferred, future, planned, manual)
- Requirements: 22
- Covered: 12
- Missing: 10
- Coverage: 54.5%

## Overall (all testable requirements)
- Requirements: 94
- Covered: 84
- Missing: 10
- Coverage: 89.4%

The following DEFERRED requirements have **no referenced tests** (CI does NOT fail):

### EXP (1)
- EXP-PLUG-001 — Canonical plugin export layout

### IMP (1)
- IMP-PLUG-001 — Importers must include plugin manifests and bundles

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
