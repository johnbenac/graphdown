# CI Failure Memo — Web Build (apps/web)

## Summary
- Web workspace fails during `npm --workspace apps/web run build` because it imports outdated graph types and fields.
- Core graph API now exports `GraphTypeNode`/`GraphRecordNode` with `typeId`, `recordId`, `recordKey`; it no longer exports `GraphNode`, `GraphTypeDef`, or `parseMarkdownRecord`.
- UI code still expects old names and properties (`GraphNode`, `GraphTypeDef`, `recordTypeId`, `id`, and `parseMarkdownRecord` from `graph.ts`), triggering TypeScript errors.

## Evidence (from CI log)
- Errors like “Module '../../src/core/graph' has no exported member 'GraphNode'/'GraphTypeDef'.”
- Property access failures on `recordTypeId` and `id` against `GraphTypeNode`/`GraphRecordNode`.
- `DatasetContext.tsx` imports `parseMarkdownRecord` from `graph.ts`, but that function lives in `src/core/markdownRecord`.

## Root Cause
- Core graph typings changed (see `src/core/graph.ts`), but the web app was not updated to match the new interfaces and exports.

## Fix Direction
- Update web imports to use `GraphTypeNode`/`GraphRecordNode` (and `Graph` where needed) from `src/core/graph.ts`.
- Replace field usages: `recordTypeId` → `typeId`; `id` → `recordKey` or `recordId` as appropriate.
- Import `parseMarkdownRecord` from `src/core/markdownRecord`.
- After aligning types, rerun `npm --workspace apps/web run build` (and web tests if needed).
