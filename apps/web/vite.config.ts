import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pagesBase = process.env.PAGES_BASE;
const appKitIndex = path.resolve(__dirname, "../../packages/app-kit/src/index.ts");
const datasetIndex = path.resolve(__dirname, "../../packages/dataset/src/index.ts");
const coreIndex = path.resolve(__dirname, "../../packages/core/src/index.ts");
const ioIndex = path.resolve(__dirname, "../../packages/io/src/index.ts");
const ioGitHubIndex = path.resolve(__dirname, "../../packages/io-github/src/index.ts");
const ioZipIndex = path.resolve(__dirname, "../../packages/io-zip/src/index.ts");
const persistenceIndex = path.resolve(__dirname, "../../packages/persistence/src/index.ts");
const runtimeIndex = path.resolve(__dirname, "../../packages/runtime/src/index.ts");
const storageIdbIndex = path.resolve(__dirname, "../../packages/storage-idb/src/index.ts");

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
    alias: [
      { find: /^@graphdown\/app-kit$/, replacement: appKitIndex },
      { find: /^@graphdown\/dataset$/, replacement: datasetIndex },
      { find: /^@graphdown\/core$/, replacement: coreIndex },
      { find: /^@graphdown\/io$/, replacement: ioIndex },
      { find: /^@graphdown\/io-github$/, replacement: ioGitHubIndex },
      { find: /^@graphdown\/io-zip$/, replacement: ioZipIndex },
      { find: /^@graphdown\/persistence$/, replacement: persistenceIndex },
      { find: /^@graphdown\/runtime$/, replacement: runtimeIndex },
      { find: /^@graphdown\/storage-idb$/, replacement: storageIdbIndex }
    ]
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
