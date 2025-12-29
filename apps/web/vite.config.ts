import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1];

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS && repoName ? `/${repoName}/` : "/",
  server: {
    port: 5173,
    host: true,
    fs: {
      allow: ["../.."]
    }
  },
  test: {
    // Ensure describe/it/expect exist globally at runtime
    globals: true,

    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",

    // Only treat src tests as unit tests
    include: ["src/**/*.{test,spec}.{ts,tsx}"],

    // Make sure Playwright specs never get collected by Vitest
    exclude: ["e2e/**", "**/e2e/**"],

    // optional, but helps when importing CSS in components
    css: true,
  },
});
