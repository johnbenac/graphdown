# Components

This folder contains reusable React components used across the web app. Most
components are presentational and consume data passed from `routes/` or the
`DatasetContext` state layer.

## Layout + navigation

- `AppShell.tsx`
  - Provides the page chrome: top navigation, sidebar slot, and main panel.
  - Used by every route-level screen to keep layout consistent.
- `TopNav.tsx`
  - The global navigation bar with links to Import, Datasets, and Export.
  - Uses `NavLink` to apply active styles automatically.
- `TypeNav.tsx`
  - Sidebar navigation for record types when browsing a dataset.
  - Displays record counts per type and derives labels from type metadata via
    `getTypeLabel`.

## Buttons and UI helpers

- `Button.tsx`
  - Thin wrapper around `<button>` that applies Graphdown button classes and
    supports a `secondary` variant.
- `Panel.tsx`
  - Simple container that renders a section header and wraps child content.
- `EmptyState.tsx`
  - Shared empty-state component used when there is no data to render.

## Dataset browsing + editing

- `RecordViewer.tsx`
  - Read-only view of a record: ID, type, field YAML, body, and graph links.
  - Accepts outgoing/incoming link lists from the graph so it stays display-only.
- `RecordEditor.tsx`
  - Form for editing or creating records.
  - Edits YAML fields using `yaml` parsing, validates basic shape, and delegates
    persistence to `DatasetContext.updateRecord` / `createRecord`.
- `TypeViewer.tsx`
  - Read-only view of type metadata, including fields and body markdown.

## Import feedback

- `ImportWarningBanner.tsx`
  - Displays ignored files or dropped blocks after imports.
  - Uses a summary header with expandable lists for samples.
  - `hasImportWarnings` is exported for route-level visibility checks.

## Tests

Component-level tests live next to their components:

- `RecordEditor.raw.unit.test.tsx` and `TypeViewer.unit.test.tsx` validate editor and
  viewer behavior.
