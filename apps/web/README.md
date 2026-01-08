# Graphdown Web (Developer Guide)

This is the React/Vite frontend for importing, validating, browsing, editing, and exporting Graphdown datasets. It uses the shared graphdown validation library and persists the active dataset in the browser using IndexedDB (required).

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
- `src/main.tsx` boots the app; `src/App.tsx` wires top-level routes and layout.
- `src/graphdown/` shared, pure logic for dataset parsing/validation/graph construction (hashing, IDs, refs, markdown parsing, etc.).
- `src/import/` dataset ingest: `readZipSnapshot` for local zip uploads; `import/github/` parses GitHub URLs and fetches repo contents with error mapping.
- `src/features/export/` bundles the active dataset back into a zip.
- `src/state/` app-level state: `DatasetContext` orchestrates import pipeline → validation → canonicalization → graph build → persistence; `importReport` summarizes ignored/normalized files.
- `src/persistence/` serializes dataset snapshots, graphs, and UI state; versioned via `versions.ts`; `serializeGraph`/`serializeSnapshot` define on-disk formats.
- `src/storage/` IndexedDB-backed persistence and the `PersistStore` wrapper.
- `src/routes/` page containers (`ImportRoute`, `DatasetRoute`, `ExportRoute`) that compose the UI for each flow.
- `src/components/` reusable UI pieces (navigation, record/type viewers and editors, warning banners, layout primitives).
- `src/utils/` small helpers (e.g., wiki link parsing).
- `src/__tests__/` fixture data and integration-style tests for the graphdown library.
- `setupTests.ts` configures the Vitest/React Testing Library environment.

## Data flow quick reference
1) **Import (zip or GitHub)** → `readZipSnapshot` or `loadGitHubSnapshot` loads raw files.  
2) **Validate** → `validateDatasetSnapshot` enforces Graphdown schema; errors bubble to the UI.  
3) **Canonicalize** → `canonicalizeDatasetSnapshot` normalizes ordering/paths; `importReport` captures ignored files.  
4) **Graph build** → `buildGraphFromSnapshot` makes the graph used by the UI.  
5) **Persist** → `createPersistence` writes snapshot + graph + UI state to the configured store.  
6) **View/Edit** → `DatasetRoute` renders `RecordViewer`/`RecordEditor` with data from `DatasetContext`.  
7) **Export** → `features/export/` serializes the current snapshot back to a zip.

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
- Keep `src/graphdown/` pure and framework-agnostic; the UI should consume it, not reimplement logic.
- When touching import/export/persistence flows, add or update Vitest coverage and regenerate Playwright snapshots if UI changes.
- The app requires IndexedDB for persistence; environments that block it are unsupported.
