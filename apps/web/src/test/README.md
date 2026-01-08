# Web app test conventions

- Playwright tests live only in `apps/web/e2e`.
- Vitest tests live only in `apps/web/src/**/__tests__/**`.
- Fixtures belong in `__fixtures__` next to the module they support (or `src/test/fixtures` only when truly shared).
- Do not place tests next to production files.
