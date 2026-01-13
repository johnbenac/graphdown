# Deploy contract: GitHub Pages

This repository only deploys the production site when code or configs that affect the shipped bundle change. Deploys are gated in `.github/workflows/pages.yml` by a `dorny/paths-filter` check plus a manual override input.

## What triggers a deploy (production surface area)
- `apps/web/src/**`, `apps/web/index.html`, `apps/web/styles.css`
- `apps/web/vite.config.*`, `apps/web/tsconfig*.json`, `apps/web/package.json`
- `packages/core/src/**`, `packages/core/package.json`
- Root build inputs: `package.json`, `package-lock.json`, `tsconfig.json`

## What never triggers a deploy
- Tests and harnesses: `apps/web/e2e/**`, `apps/web/**/__tests__/**`, `apps/web/test-results/**`, `packages/core/**/__tests__/**`
- CI/meta: `.github/**`
- Documentation and generated artifacts: `docs/**`, `artifacts/**`

## How to force a deploy
- Run the Pages workflow manually (`workflow_dispatch`) with `force_deploy=true` when you need to publish despite no deploy-relevant diffs (e.g., Pages queue recovery or content cache issues).

## Changing this contract
- Updates to `.github/workflows/pages.yml` and this document require review from the DevOps CODEOWNERS to prevent accidental deploy-scope creep.
