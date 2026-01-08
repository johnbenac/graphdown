# Web app test layout

- Playwright tests live only in `apps/web/e2e`.
- Vitest tests live only in `apps/web/src/**/__tests__/**`.
- Fixtures live in `__fixtures__` directories next to the module under test (use `apps/web/src/test/fixtures` only when truly shared).
- Do not place test files next to production modules.
