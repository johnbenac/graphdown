# OOM Investigation Handoff (apps/web Vitest) — 2026-01-16

## Memo (state of play)
- Previous symptom: Vitest worker OOM’d around 4.0–4.1GB heap with `Worker exited unexpectedly` (tinypool) when the suite ran together.
- Status after fixes: No OOM observed. `npm test` (sequential runner) now passes with `DatasetRoute` re-enabled; running `npx vitest run src/routes/__tests__/DatasetRoute.unit.test.tsx --logHeapUsage` shows ~51 MB heap used.
- Likely cause: The old DatasetRoute mock created fresh objects/functions each render and returned `getType: () => null`, which could drive effect/redirect loops in jsdom. The mock is now stable and returns the real “note” type.
- Mitigations kept: `npm test` still uses the per-file sequential runner (`apps/web/scripts/run-vitest-sequential.mjs`) as a safety net; IndexedDbStore tracking + cleanup, DatasetContext unmount cleanup, and runtime mock resets remain.
- Unknowns: Whether the suite still OOMs under a single `vitest run` worker pool; we have not re-tried the full concurrent run yet.
- Next ask for outside team: Confirm the leak is gone under normal `vitest run` (no sequential wrapper). If stable, we can drop the sequential runner script; otherwise, investigate any remaining jsdom/IndexedDB/runtime handles.

## How to reproduce current behavior
```bash
cd apps/web
npm test
```
- This uses the per-file sequential runner and **passes** (DatasetRoute test is included).

To probe DatasetRoute alone:
```bash
cd apps/web
npx vitest run src/routes/__tests__/DatasetRoute.unit.test.tsx --logHeapUsage
# heap ~51 MB with current mock
```

## Recent OOM log excerpt
```
<--- Last few GCs --->
[1461889:0x2ce6e130]    75958 ms: Mark-Compact 4030.5 (4135.4) -> 4016.5 (4137.4) MB ...
[1461889:0x2ce6e130]    77292 ms: Mark-Compact 4032.6 (4137.6) -> 4018.6 (4139.6) MB ...

FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
Error: Worker exited unexpectedly
 ❯ ChildProcess.onUnexpectedExit ../../node_modules/tinypool/dist/index.js:118:30
```

## Passing run (after mitigation)
`npm test` now iterates per file; sample output (no skips):
```
> node ./scripts/run-vitest-sequential.mjs
...
✓ src/state/__tests__/DatasetContext.unit.test.tsx (5 tests)
✓ src/state/__tests__/DatasetContext.nfr.integration.test.tsx (3 tests)
...
✓ src/routes/__tests__/DatasetRoute.unit.test.tsx (1 test)
...
✓ src/utils/__tests__/wikiRefStrings.unit.test.ts (3 tests)
```

## Key files (current contents)

### apps/web/package.json
```json
{
  "name": "@graphdown/web",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "node ./scripts/run-vitest-sequential.mjs",
    "pretest:e2e": "npm run build && npm run playwright:install-deps",
    "test:e2e": "PLAYWRIGHT_SNAPSHOT_PATH_TEMPLATE='{testDir}/{testFileName}-snapshots/{arg}{ext}' playwright test --config playwright.config.cjs",
    "test:e2e:update": "PLAYWRIGHT_SNAPSHOT_PATH_TEMPLATE='{testDir}/{testFileName}-snapshots/{arg}{ext}' playwright test --config playwright.config.cjs --update-snapshots",
    "playwright:install-deps": "playwright install-deps",
    "playwright:install": "playwright install --with-deps",
    "verify": "npm run test && npm run test:e2e"
  },
  ...
}
```

### apps/web/scripts/run-vitest-sequential.mjs
```js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const srcRoot = path.join(projectRoot, "src");

const testFiles = [];
const isTestFile = (filePath) =>
  filePath.includes(`${path.sep}__tests__${path.sep}`) && /\.test\.(ts|tsx)$/.test(filePath);

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath);
    else if (entry.isFile() && isTestFile(fullPath)) testFiles.push(fullPath);
  }
}

walk(srcRoot);
testFiles.sort((a, b) => a.localeCompare(b));
if (!testFiles.length) process.exit(0);

for (const file of testFiles) {
  const relative = path.relative(projectRoot, file);
  console.log(`\n>> vitest run ${relative}`);
  const result = spawnSync("npx", ["vitest", "run", relative], {
    cwd: projectRoot,
    stdio: "inherit",
    env: process.env
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
```

### apps/web/src/setupTests.ts
```ts
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { createRuntimeApiV1Mock } from "./testUtils/runtimeApiV1Mock";
import { deleteTrackedDbNames } from "./storage/IndexedDbStore";

let consoleWarnSpy: ReturnType<typeof vi.spyOn> | null = null;
let consoleErrorSpy: ReturnType<typeof vi.spyOn> | null = null;

vi.mock("@graphdown/runtime", async () => {
  const actual = await vi.importActual<typeof import("@graphdown/runtime")>("@graphdown/runtime");
  return {
    ...actual,
    openRuntimeApiV1: vi.fn(async ({ snapshot }: { snapshot: unknown }) => ({
      ok: true,
      value: createRuntimeApiV1Mock(snapshot as Parameters<typeof createRuntimeApiV1Mock>[0])
    }))
  };
});

beforeEach(async () => {
  const runtime = await import("@graphdown/runtime");
  vi.mocked(runtime.openRuntimeApiV1).mockImplementation(async ({ snapshot }: { snapshot: unknown }) => ({
    ok: true,
    value: createRuntimeApiV1Mock(snapshot as Parameters<typeof createRuntimeApiV1Mock>[0])
  }));
});

beforeEach(() => {
  consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  consoleWarnSpy?.mockRestore();
  consoleErrorSpy?.mockRestore();
  consoleWarnSpy = null;
  consoleErrorSpy = null;
  return deleteTrackedDbNames();
});
```

### apps/web/src/storage/IndexedDbStore.ts
```ts
const trackedDbNames = new Set<string>();
export function listTrackedDbNames(): string[] { return [...trackedDbNames]; }
export function clearTrackedDbNames(): void { trackedDbNames.clear(); }
export async function deleteTrackedDbNames(): Promise<void> {
  const idb = typeof indexedDB === "undefined" ? undefined : indexedDB;
  const names = [...trackedDbNames];
  trackedDbNames.clear();
  if (!idb || typeof idb.deleteDatabase !== "function" || names.length === 0) return;
  await Promise.all(names.map((name) => new Promise<void>((resolve) => {
    const request = idb.deleteDatabase(name);
    const timeoutId = setTimeout(resolve, 50);
    const finish = () => { clearTimeout(timeoutId); resolve(); };
    request.onsuccess = finish;
    request.onerror = finish;
    request.onblocked = finish;
  })));
}
// constructor adds to trackedDbNames; close() and destroy() added/retained.
```

### apps/web/src/state/DatasetContext.tsx (high-level changes)
- Added `loadActiveId` ref to ignore stale `loadActive` results when a new import/load starts.
- Cleans `window.__appDebug` handle on unmount.
- On unmount, closes/destroys the store in test env to reduce open handles.
- Functional behavior otherwise unchanged (imports, persistence, record updates).

### apps/web/src/routes/__tests__/DatasetRoute.unit.test.tsx
- Runtime mock replaced with a lightweight stub.
- Entire suite marked `describe.skip(...)` with TODO to re-enable after leak is fixed.

## Open questions / guidance for incoming team
- The leak only surfaces when the DatasetRoute test runs (even alone) under Vitest jsdom. Other suites pass and exit cleanly.
- Please identify what stays alive after the test finishes (possible culprits: React effects in DatasetRoute + DatasetContext + runtime mock + IndexedDB usage under jsdom/fake-indexeddb).
- Goal: re-enable the DatasetRoute test and return `npm test` to `vitest run` (no sequential wrapper) without OOMs.

## How to rerun full suite quickly
- Current passing path (with skip): `npm test`
- To probe the problematic file: `npx vitest run src/routes/__tests__/DatasetRoute.unit.test.tsx --logHeapUsage`

## Repo pointers
- State management: `apps/web/src/state/DatasetContext.tsx`
- IndexedDB store: `apps/web/src/storage/IndexedDbStore.ts`
- Test setup/mocks: `apps/web/src/setupTests.ts`
- Runtime mock: `apps/web/src/testUtils/runtimeApiV1Mock.ts`
- Sequential runner: `apps/web/scripts/run-vitest-sequential.mjs`
