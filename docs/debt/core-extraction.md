# Technical Debt: Graphdown Core Extraction

**Point-in-time:** commit `50826b69a34976301a71d96f8858ebf013b593b3`  
**Context:** Graphdown logic was moved out of the web app (`apps/web/src/graphdown/**`) into a dedicated workspace package (`packages/core/src/**`). The web app now imports from `@graphdown/core`.

---

## Snapshot of the current state (as of commit `50826b69a34976301a71d96f8858ebf013b593b3`)

### What is working / achieved

* **Core code is now a workspace package**: `packages/core/src/**` contains Graphdown’s implementation (cid/graph/model/parse/runtime/snapshot/validate/zip + `index.ts`).
* **Fixtures and tests were relocated into package-scoped folders**
  * `packages/core/src/__fixtures__/**`
  * `packages/core/src/__tests__/**`
* **Web app consumes core via the package name**
  * Web imports use `@graphdown/core` (no more `apps/web/src/graphdown/*` imports).
  * Tooling is wired so dev/build works by referencing core source:
    * `apps/web/tsconfig.json` uses a `paths` mapping to `../../packages/core/src/index.ts`
    * `apps/web/vite.config.ts` aliases `@graphdown/core` to `packages/core/src/index.ts`
* **Guardrails exist to keep core “package-like”**
  * ESLint restrictions prevent framework coupling in core (`react`, `react-dom`, `react-router-dom`).
  * ESLint restrictions prevent the web app from deep-importing `@graphdown/core/src/**`.
  * `tools/check-tsc-build-scope.cjs` ensures the core build scope doesn’t accidentally include tests/fixtures and also blocks reintroducing legacy directory layouts.
* **CI validates core in a Node context**
  * CI builds core as CommonJS into a temporary `.ci` output folder and runs dataset validation against external repos.

This is a successful **internal extraction**: the web app no longer owns the implementation, and boundaries are being enforced.

---

## Technical debt list

### TD-001 — `@graphdown/core` is not a “real distributable package” yet

**Category:** Packaging / Distribution  
**Current situation:**

* `packages/core/package.json` exports TypeScript source:
  * `"exports": { ".": "./src/index.ts" }`
* `@graphdown/core` is `"private": true`
* There is no standard “build output” directory (`dist/`) for the package, no `.d.ts` emission configured for consumers, and no exports map for built JS artifacts.

**Why this is debt:**

* This works inside the monorepo (Vite/TS compile core as source), but it **won’t work as a normal npm-installed dependency** in most environments without extra TypeScript execution tooling.
* It also means we are **not exercising** a “consumer installs core and imports it” pathway during normal web builds.

**Suggested later work:**

* Add a proper package build pipeline for core (at minimum ESM; optionally dual ESM+CJS).
* Emit types (`.d.ts`) and point package exports to built artifacts.
* Decide whether core stays internal-only (`private: true`) or becomes publishable.

**Priority:** Medium (unless publishing/external consumption becomes immediate)

---

### TD-002 — Web builds against core *source* via aliasing, not against a built package

**Category:** Build correctness / Release readiness  
**Current situation:**

* Web resolves `@graphdown/core` to `packages/core/src/index.ts` using:
  * TS `paths` mapping
  * Vite alias

**Why this is debt:**

* This can hide packaging/runtime issues that will appear later when:
  * core is built separately
  * core is consumed via Node resolution / installed dependency
* It also couples web build output to core source layout (refactors in core can break web “resolution” in non-obvious ways).

**Suggested later work:**

* Once core has a build output, introduce a mode where web imports core via built artifacts (or via workspace resolution without source alias).
* Add a CI job that builds core and then builds web against the built package (to simulate real consumption).

**Priority:** Medium

---

### TD-003 — Core uses a CI-only CommonJS build path that may diverge from the final module strategy

**Category:** Build strategy / Module system  
**Current situation:**

* CI compiles core using `packages/core/tsconfig.build.cjs.json` (CommonJS) into a temporary folder and then `require()`s it.

**Why this is debt:**

* This is great for Node validation today, but it creates a “special CI build mode” that may drift from the eventual distribution strategy (likely ESM exports, or dual exports).
* If core eventually becomes ESM-first, we’ll need a coherent story for:
  * ESM consumers
  * CJS consumers (if supported)
  * Node version expectations

**Suggested later work:**

* Decide the official module format(s) for core (ESM-only vs dual).
* Align CI validation with the official build outputs.

**Priority:** Medium

---

### TD-004 — Spec trace tooling coverage for Playwright E2E tests (resolved)

**Category:** Tooling / Governance  
**Current situation:**

* `tools/spec-trace.cjs` collects Playwright tests matching `apps/web/e2e/*.e2e.spec.(js|ts)`
* Repo tree stores Playwright tests as `apps/web/e2e/app.e2e.spec.js`
* Snapshot skip path in `spec-trace.cjs` skips `app.e2e.spec.js-snapshots`

**Status:** Resolved by aligning the E2E naming convention and the spec-trace discovery rules.

---

### TD-005 — Core typechecking config includes Vitest globals even though tests are excluded

**Category:** Type safety / Configuration hygiene  
**Current situation:**

* `packages/core/tsconfig.json` includes `"types": ["node", "vitest/globals"]`
* Tests are excluded from this tsconfig.

**Why this is debt:**

* It’s easy to accidentally rely on test-only globals in non-test code and not notice.
* If/when core becomes publishable, we’ll want clean separation between “library compile types” and “test compile types”.

**Suggested later work:**

* Split tsconfigs (e.g., `tsconfig.json` for library, `tsconfig.test.json` for tests) or move `vitest/globals` into the test-specific config.

**Priority:** Low

---

### TD-006 — Root-level `tsconfig.json` and existing `dist/` contents suggest legacy build outputs that could confuse maintainers

**Category:** Repo hygiene / Build clarity  
**Current situation:**

* Repo has multiple build-related artifacts/paths:
  * root `tsconfig.json` compiling from `packages/core/src` to `dist/`
  * `dist/core/**` and `dist/graphdown/**` appear in the tree
  * `packages/core` has its own tsconfigs for typecheck and CI-only CJS build

**Why this is debt:**

* Multiple overlapping build configs/outputs can cause confusion about:
  * the “official” build pipeline
  * what `dist/` represents
  * which entrypoints are correct

**Suggested later work:**

* Consolidate to a single “official” build story:
  * core package build lives in `packages/core`
  * root build scripts call into workspace builds (or are removed)
* If `dist/graphdown/**` is legacy, decide whether to remove or regenerate consistently.

**Priority:** Low–Medium

---

### TD-007 — Internal/public API boundaries may still be implicit (needs a deliberate “core API surface” pass)

**Category:** API design / Maintainability  
**Current situation:**

* The web app uses core via the barrel (`@graphdown/core`), which is good.
* The actual “public API surface” is defined by whatever `packages/core/src/index.ts` exports today.

**Why this is debt:**

* Without an intentional API surface review, it’s easy for core to:
  * leak internals
  * become hard to version or document
  * accumulate “web-specific convenience” exports

**Suggested later work:**

* Audit `packages/core/src/index.ts` exports and explicitly decide what is public.
* Add documentation for core’s public API, and consider a lightweight “API stability” policy (even if internal-only).

**Priority:** Low (Medium if publishing becomes a goal)

---

## Summary: what we’re intentionally accepting right now

As of commit `50826b69a34976301a71d96f8858ebf013b593b3`, we are accepting that:

* `@graphdown/core` is an **internal workspace package**, not yet a publishable/standalone npm dependency.
* The web app builds against **core source via aliasing**, not against built artifacts.
* CI validates core via a **special CJS compilation path**.
* Some tooling (spec trace) may be slightly out of sync with current E2E test file extensions/layout.
* There are some “configuration hygiene” items we can tighten later as the package matures.

This is acceptable for the current stage, and we can move on with feature work while keeping the above items queued for later cleanup when external consumption/release readiness becomes a goal.
