# Test and fixture layout

- Playwright tests live only in `apps/web/e2e`.
- Vitest tests live only in `apps/web/src/**/__tests__/**`.
- Fixtures go in `__fixtures__` next to their module.
- Don’t add tests next to production files anymore.
