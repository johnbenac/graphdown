const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./e2e",
  webServer: {
    command: "npm run dev -- --host 0.0.0.0 --port 5173",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI
  },
  use: {
    baseURL: "http://127.0.0.1:5173",
    viewport: { width: 1280, height: 720 }
  },
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      // Allow small rendering differences between local and CI environments
      maxDiffPixelRatio: 0.05
    },
    snapshotPathTemplate: "{testDir}/app.spec.ts-snapshots/{arg}{ext}"
  }
});
