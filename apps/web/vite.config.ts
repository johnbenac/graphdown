import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const pagesBase = process.env.PAGES_BASE;

function normalizeBase(base: string | undefined): string {
  if (!base) {
    return "/";
  }

  const withLeadingSlash = base.startsWith("/") ? base : `/${base}`;
  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash
    : `${withLeadingSlash}/`;
}

export default defineConfig({
  base: normalizeBase(pagesBase),
  plugins: [react()],
  resolve: {
    alias: {
      "@graphdown/core": path.resolve(
        __dirname,
        "../../packages/core/src/index.ts"
      )
    }
  },
  server: {
    port: 5173,
    host: true
  },
  test: {
    // Ensure describe/it/expect exist globally at runtime
    globals: true,

    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",

    // Only treat src tests as unit tests
    include: ["src/**/__tests__/**/*.test.{ts,tsx}"],

    // Make sure Playwright specs never get collected by Vitest
    exclude: ["e2e/**", "**/e2e/**", "node_modules/**", "dist/**"],

    // optional, but helps when importing CSS in components
    css: true,
  },
});
