# Graphdown Web

## Run the app

From the repo root:

```sh
npm install
npm run dev:web
```

## Verify UI (unit + E2E)

From the repo root:

```sh
npm run verify:web
```

## Playwright setup

Install the browser once before running E2E tests:

```sh
npx playwright install --with-deps chromium
```

## Screenshots

Playwright snapshot files live alongside the spec at:

```
apps/web/e2e/app.spec.ts-snapshots/
```

UI changes should update snapshots intentionally (run `npm --workspace apps/web run test:e2e:update`).
