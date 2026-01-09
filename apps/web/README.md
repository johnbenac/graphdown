# Graphdown Web (Developer Guide)

This is the React/Vite frontend for importing, validating, browsing, editing, and exporting Graphdown datasets.

It uses the shared `graphdown/` domain logic and persists the active dataset in the browser using IndexedDB (required).

## Run the app
From the repo root:
```sh
npm install
npm run dev:web   # starts Vite on port 5173
```

Static build (used by GitHub Pages):

```sh
npm --workspace apps/web run build
```

`PAGES_BASE` is read at build time when deploying to Pages for SPA routing.

## Project layout

* `src/main.tsx` boots the app; `src/App.tsx` wires top-level routes and layout.
* `src/graphdown/` shared, pure logic for dataset parsing/validation/link extraction (hashing, IDs, refs, markdown parsing, etc.).
* `src/import/` dataset ingest: zip uploads and GitHub repo fetchers.
* `src/features/export/` bundles the active dataset snapshot into a zip.
* `src/state/` app-level state: `DatasetContext` orchestrates import → validation → canonical layout → Record Link Graph build → persistence.
* `src/persistence/` serializes dataset snapshots, the Record Link Graph cache, and UI state.
* `src/storage/` IndexedDB-backed persistence.
* `src/routes/` page containers (`ImportRoute`, `DatasetRoute`, `ExportRoute`) that compose the UI for each flow.
* `src/components/` reusable UI pieces (navigation, record/type viewers and editors, warning banners, layout primitives).
* `src/utils/` small UI-friendly helpers (e.g., wiki-link parsing/formatting).
* `src/__tests__/` fixture data and integration-style tests for the graphdown library.
* `setupTests.ts` configures the Vitest/React Testing Library environment.

## Data flow quick reference

1. **Import (zip or GitHub)** → loaders build a raw `DatasetSnapshot` from bytes or GitHub files.
2. **Validate** → `validateDatasetSnapshot` enforces Graphdown structural rules; errors bubble to the UI.
3. **Canonicalize layout** → `canonicalizeDatasetSnapshot` rewrites paths into the canonical record-only layout and prunes unreachable blobs; `importReport` summarizes changes.
4. **Build Record Link Graph** → `buildRecordLinkGraphFromSnapshot` builds the Record Link Graph index used by the UI (incoming/outgoing wiki-link relationships).
5. **Persist** → `createPersistence` writes snapshot + Record Link Graph cache + UI state to storage.
6. **View/Edit** → `DatasetRoute` renders record/type views using data from `DatasetContext`.
7. **Export** → export helpers serialize the current snapshot back to a zip.

> Note: Core record discovery is content-based (LAYOUT-001), but the web app importers may choose to only load a subset of repository files for UX/performance.

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

Playwright snapshots live next to the spec: `apps/web/e2e/app.spec.ts-snapshots/`. Update them intentionally with `npm --workspace apps/web run test:e2e:update`.

## Notes for contributors

* Keep `src/graphdown/` pure and framework-agnostic; the UI should consume it, not reimplement logic.
* When touching import/export/persistence flows, add or update Vitest coverage and regenerate Playwright snapshots if UI changes.
* The app requires IndexedDB for persistence; environments that block it are unsupported.
