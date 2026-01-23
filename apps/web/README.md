# GraphMD Web (Developer Guide)

This is the React/Vite frontend for importing, validating, browsing, editing, and exporting GraphMD datasets.

It uses `@graphmd/dataset` for parsing/validation and `@graphmd/runtime` as the read model, persisting the active dataset in the browser using IndexedDB (required).

## Run the app
From the repo root:
```sh
npm ci
npm run dev:web   # starts Vite on port 5173
```

Static build (used by GitHub Pages):

```sh
npm --workspace apps/web run build
```

`PAGES_BASE` is read at build time when deploying to Pages for SPA routing.

## Project layout

* `src/main.tsx` boots the app; `src/App.tsx` wires top-level routes and layout.
* `@graphmd/dataset` shared, pure logic for dataset parsing/validation/hash/export helpers.
* `@graphmd/runtime` read model (Runtime API v1 sessions for querying types/records/links/blocks).
* `src/import/` dataset ingest: zip uploads and GitHub repo fetchers.
* `src/features/export/` bundles the active dataset snapshot into a zip.
* `src/state/` app-level state: `DatasetContext` orchestrates import → validation → canonical layout → runtime session → persistence.
* `@graphmd/persistence` serializes dataset snapshots and UI state.
* `@graphmd/storage-idb` provides the IndexedDB-backed store used by the web app.
* `src/routes/` page containers (`ImportRoute`, `DatasetRoute`, `ExportRoute`) that compose the UI for each flow.
* `src/components/` reusable UI pieces (navigation, record/type viewers and editors, warning banners, layout primitives).
* `src/utils/` small UI-friendly helpers (e.g., wiki-link parsing/formatting).
* `src/__tests__/` fixture data and integration-style tests for the web app.
* `setupTests.ts` configures the Vitest/React Testing Library environment.

## Data flow quick reference

1. **Import (zip or GitHub)** → loaders build a raw `DatasetSnapshot` from bytes or GitHub files.
2. **Validate** → `validateDatasetSnapshot` enforces GraphMD structural rules; errors bubble to the UI.
3. **Canonicalize layout** → `canonicalizeDatasetSnapshot` rewrites paths into the canonical record-only layout and prunes unreachable blocks; `importReport` summarizes changes.
4. **Open runtime session** → `openRuntimeApiV1` builds the Runtime API v1 read model from the snapshot.
5. **Persist** → `createPersistence` writes snapshot + UI state to storage.
6. **View/Edit** → `DatasetRoute` renders record/type views using data from `DatasetContext`.
7. **Export** → export helpers serialize the current snapshot back to a zip.

> Note: Core record discovery is content-based (LAYOUT-001), but web app importers may load only a subset of repository files for UX/performance as long as they still include all semantic files (records, types, plugin manifests + bundles, and referenced blocks).

## Testing

From the repo root (uses workspace scripts):

```sh
npm --workspace apps/web run test        # Vitest unit/integration
npm --workspace apps/web run test:e2e    # Playwright E2E (Chromium)
npm --workspace apps/web run verify      # Runs both suites
```

Install Playwright once (or after CI cache busts):

```sh
npx playwright install --with-deps chromium
```

Playwright snapshots live next to the spec: `apps/web/e2e/app.e2e.spec.js-snapshots/`. Update them intentionally with `npm --workspace apps/web run test:e2e:update`.

## Notes for contributors

* Keep `@graphmd/dataset` pure and framework-agnostic; the UI should consume it through the runtime read model, not reimplement logic.
* When touching import/export/persistence flows, add or update Vitest coverage and regenerate Playwright snapshots if UI changes.
* The app requires IndexedDB for persistence; environments that block it are unsupported.
