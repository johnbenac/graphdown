# Graphdown Web

## Getting started

From the repo root:

```bash
npm install
npm run dev:web
```

The dev server runs at `http://127.0.0.1:5173`.

## Verify UI

Run the full unit + E2E loop from the repo root:

```bash
npm run verify:web
```

### Playwright browser install

Playwright needs a browser binary (CI should install this once):

```bash
npx playwright install --with-deps chromium
```

## Screenshots

Playwright snapshot files live alongside the tests in:

```
apps/web/e2e/app.spec.ts-snapshots/
```

If you change UI, update snapshots intentionally via:

```bash
npm --workspace apps/web run test:e2e:update
```
