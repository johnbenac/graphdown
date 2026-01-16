import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pagesBase = process.env.PAGES_BASE;
const isCI = !!process.env.CI;
const lightRoutes = process.env.VITEST_LIGHT_ROUTES === "1";
const coreIndex = path.resolve(__dirname, "../../packages/core/src/index.ts");
const runtimeIndex = path.resolve(__dirname, "../../packages/runtime/src/index.ts");
const runtimeStub = path.resolve(__dirname, "src/testStubs/runtime.ts");

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
  esbuild: {
    sourcemap: false,
  },
  plugins: [
    react({
      babel: { sourceMaps: false },
    })
  ],
  resolve: {
    alias: [
      { find: /^@graphdown\/core$/, replacement: coreIndex },
      // For routes shard only, alias runtime to stub to reduce Vite transform demand
      // Other tests use vi.mock which allows real runtime when needed
      { find: /^@graphdown\/runtime$/, replacement: lightRoutes ? runtimeStub : runtimeIndex }
    ]
  },
  server: {
    port: 5173,
    host: true
  },
  test: {
    // Ensure describe/it/expect exist globally at runtime
    globals: true,

    // Automatically restore globals/envs between tests to prevent leaks
    unstubGlobals: true,
    unstubEnvs: true,

    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",

    // Only treat src tests as unit tests
    include: ["src/**/__tests__/**/*.test.{ts,tsx}"],

    // Make sure Playwright specs never get collected by Vitest
    exclude: ["e2e/**", "**/e2e/**", "node_modules/**", "dist/**"],

    // Disable CSS processing in unit tests to reduce memory usage
    css: false,

    // Prevent hanging tests and reduce memory pressure
    testTimeout: 30000,
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: isCI,
        maxForks: isCI ? 1 : 2,
        minForks: 1
      }
    }
  },
});
