// Skip Playwright browser installation in CI; run it only locally.
const { execSync } = require("node:child_process");

const isCI = Boolean(process.env.CI) || Boolean(process.env.GITHUB_ACTIONS);

if (isCI) {
  console.log("[postinstall] CI detected: skipping Playwright browser install (CI installs browsers explicitly in the E2E job).");
  process.exit(0);
}

execSync("npm --workspace apps/web run playwright:install", { stdio: "inherit" });
