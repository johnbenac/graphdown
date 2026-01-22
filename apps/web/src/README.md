# Web app source overview

This directory contains the React + Vite front-end for Graphdown. It wires the
routing shell, dataset lifecycle, and shared UI styles used by the rest of the
app-specific subfolders.

## Entry points

- `main.tsx` is the Vite bootstrap that mounts the React tree, pulls in global
  fonts, and applies `styles.css` before rendering the app root.
- `App.tsx` defines the route table, sets the router basename, and wraps the
  router in the `DatasetProvider` so every screen can access dataset state.
- `styles.css` contains the global styles for layout, typography, and component
  classes referenced throughout the components and routes.

## App routing

`App.tsx` builds the `appRoutes` array and feeds it into `createBrowserRouter`.
The routes themselves live in `routes/` and are rendered through the
`RouterProvider`, with the default route redirecting to `/import`.

## Dataset lifecycle (high level)

1. **Import**
   - Import screens call into `DatasetContext` actions to validate GitHub URLs or
     read zip files.
2. **Validation & canonicalization**
   - `@graphdown/dataset` utilities validate the dataset, normalize file layout, and prune
     unused blocks.
3. **Runtime session**
   - `@graphdown/runtime` opens a Runtime API v1 session and serves as the read model
     for types, records, links, hierarchy, and blocks.
4. **Persistence**
   - The snapshot is serialized into storage and rehydrated on load.
5. **Editing**
   - Edits from the record editor update snapshot files and commit back through
     validation and persistence.

## Directory map

- `components/` - reusable UI components (navigation, record editor/viewer, UI
  wrappers).
- `@graphdown/dataset` - dataset parsing, validation, hashing, zip handling, and front matter parsing.
- `@graphdown/runtime` - runtime session API (read model).
- `features/export/` - downloading dataset exports from the browser.
- `import/` - zip parsing + GitHub import helpers.
- `routes/` - route-level screens and navigation flows.
- `state/` - dataset context, import progress, and import reports.
- `@graphdown/persistence` - snapshot serialization and persistence orchestration.
- `@graphdown/storage-idb` - IndexedDB-backed persistence store for the web app.
- `utils/` - small UI-friendly helpers (ex: wiki link helpers for refs).

## Testing entry points

Tests for UI and dataset logic live alongside their modules (for example
`App.unit.test.tsx`, `__tests__/`, and the per-module `*.unit.test.ts(x)` or
`*.integration.test.ts(x)` files in subdirectories). The test utilities are
wired in `setupTests.ts`.
