# Trace ownership map

Use this as the “who owns what” index when tagging or auditing tests. Keep requirement prefixes aligned to the folders where the production logic lives and the primary suites that should carry the tags.

| Prefixes | Owning subsystem | Production code (primary) | Tests/checks to tag first | Notes |
| --- | --- | --- | --- | --- |
| GOV-*, P-*, NR-* | Product/spec governance | `SPEC.md` | `npm run spec:trace`, `npm run spec:verify` | Philosophy + non-requirements; no runtime hooks. |
| LAYOUT-*, FR-MD-*, EXT-*, TYPE-*, REL-*, VAL-*, CID-*, BLOCK-*, PLUG-* | Core dataset validity + parsing + export | `packages/core/src/validate/validateDatasetSnapshot.ts`, `packages/core/src/parse/markdownRecord.ts`, `packages/core/src/parse/wikiRefs.ts`, `packages/core/src/snapshot/canonicalizeDatasetSnapshot.ts`, `packages/core/src/zip/*` | `packages/core/src/__tests__/spec/*.integration.test.ts`, `packages/core/src/parse/__tests__/*.test.ts` | Core is the source of truth for validation, hashing, and canonical export. |
| API-* | Runtime API v1 read model | `packages/runtime/src/v1.ts` | `packages/runtime/src/__tests__/runtimeApiV1.unit.test.ts`, `packages/runtime/src/__tests__/runtimeApiV1.errors.unit.test.ts` | Runtime sessions are derived from validated snapshots. |
| ERR-* | Web import error surfaces | `apps/web/src/import/github/mapGitHubError.ts`, `apps/web/src/state/DatasetContext.tsx` | `apps/web/src/state/__tests__/DatasetContext.unit.test.tsx`, `apps/web/e2e/app.e2e.spec.js` | Assert in web; string refactors can regress surfaces even when core logic is stable. |
| GH-*, IMP-* | Web importers (GitHub/zip) | `apps/web/src/import/readZipSnapshot.ts`, `apps/web/src/import/github/*`, `apps/web/src/state/DatasetContext.tsx` | `apps/web/src/import/__tests__/readZipSnapshot.*.test.ts`, `apps/web/src/import/github/__tests__/*.test.ts` | Covers URL parsing, repo fetch, plugin bundle inclusion, and ignored-file reporting. |
| EXP-* | Export/import (zip) | `packages/core/src/zip/*`, `apps/web/src/features/export/*` | `apps/web/src/features/export/__tests__/*.test.ts`, `packages/core/src/__tests__/spec/roundtrip.integration.test.ts` | Ensures canonical zip output + byte preservation. |
| UI-*, UI-RAW-001, NFR-001, NFR-010, NFR-030, NFR-031 | Web UI + persistence/state | `apps/web/src/components/*`, `apps/web/src/routes/*`, `apps/web/src/state/*`, `apps/web/src/persistence/*`, `apps/web/src/storage/*` | `apps/web/src/__tests__/App.unit.test.tsx`, `apps/web/e2e/app.e2e.spec.js` | UI requirements are validated at the web layer. |
