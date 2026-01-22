// Always build dataset artifacts; skip Playwright browser installation in CI.
const { execSync } = require("node:child_process");

const isCI = Boolean(process.env.CI) || Boolean(process.env.GITHUB_ACTIONS);

execSync("npm --workspace packages/dataset run build", { stdio: "inherit" });

if (isCI) {
  console.log("[postinstall] CI detected: skipping Playwright browser install.");
  process.exit(0);
}

execSync("npm --workspace apps/web run playwright:install", { stdio: "inherit" });
