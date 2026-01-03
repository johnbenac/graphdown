const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./e2e",
  webServer: {
    // Use the built app to ensure screenshots reflect production output
    command: "npm run preview -- --host 127.0.0.1 --port 5173",
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
      // Keep this strict so stale baselines fail loudly
      maxDiffPixelRatio: 0.01
    },
    snapshotPathTemplate: "{testDir}/{testFileName}-snapshots/{arg}{ext}"
  }
});
