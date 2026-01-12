# Burndown: SPEC coverage snapshot

Generated: 2026-01-12T16:49:27.897Z
Source: artifacts/spec-trace/matrix.json

## Enforced coverage (CI gate)
- Requirements: 72
- Covered: 72
- Missing: 0
- Coverage: 100.0%

## Deferred backlog (verify in: todo, backlog, deferred, future, planned, manual)
- Requirements: 22
- Covered: 0
- Missing: 22
- Coverage: 0.0%

## Overall (all testable requirements)
- Requirements: 94
- Covered: 72
- Missing: 22
- Coverage: 76.6%

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

### PLUG (8)
- PLUG-000 — Plugins are a first-class dataset object class
- PLUG-FR-001 — Plugin manifest YAML front matter is required
- PLUG-FR-002 — Required top-level keys for plugin manifests
- PLUG-ID-001 — pluginId syntax is separator-safe
- PLUG-ID-002 — pluginId uniqueness
- PLUG-LAYOUT-001 — Plugin manifests are discovered by content (not path)
- PLUG-LAYOUT-002 — Plugin bundle files are resolved from the manifest
- PLUG-LAYOUT-003 — Plugin bundle file paths are safe and self-contained

### VAL (8)
- VAL-PLUG-001 — Plugin manifests must parse and satisfy PLUG-FR-002
- VAL-PLUG-002 — pluginId must be unique
- VAL-PLUG-003 — Plugin entry must exist and be included
- VAL-PLUG-004 — Plugin bundle file paths must resolve safely and exist
- VAL-PLUG-005 — Plugin bundle files must be UTF-8 decodable
- VAL-PLUG-006 — Plugin bundle must not contain reserved export paths
- VAL-PLUG-007 — Plugin-declared block dependencies must be valid CIDs
- VAL-PLUG-008 — Plugin-declared block dependencies must resolve to matching block bytes

_Rule: use `verify=todo` on a requirement when it is not implemented/verified yet. Promotion = remove `verify=todo` (or set `verify=ci`) + add at least one test title prefixed with the req ID._
