# Graphdown Documentation Map

This repository has two kinds of documentation:

1) **The Standard (normative):**
   - `SPEC.md` is the single source of truth for Graphdown behavior and vocabulary.
   - If anything conflicts with `SPEC.md`, `SPEC.md` wins.

2) **Developer documentation (explanatory):**
   - This `docs/` folder and the various `README.md` files under `apps/web/`
     explain how this repository implements the standard.

## Where to start

- If you are defining dataset rules or expected behavior: start with **`SPEC.md`**.
- If you are working on the web app: start with **`apps/web/README.md`**.
- If you are working inside the core domain logic: start with **`packages/core/src/README.md`**.
- If you are working on the runtime API: start with **`packages/runtime/README.md`**.

## Key concept docs

- `docs/terminology.md` — glossary of standard terms + implementation terms.
- `docs/concepts/graphs.md` — all “graphs” in this codebase, precisely named.
- `docs/concepts/snapshots-and-layout.md` — snapshots, file discovery, and canonical layouts.
