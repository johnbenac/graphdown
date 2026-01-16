import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import FDBFactory from "fake-indexeddb/lib/FDBFactory";
import FDBKeyRange from "fake-indexeddb/lib/FDBKeyRange";
import { afterEach, beforeEach, beforeAll, afterAll, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import v8 from "node:v8";
import { createRuntimeApiV1Mock } from "./testUtils/runtimeApiV1Mock";

// Print heap limit once at startup to verify it's applied
const heapStats = v8.getHeapStatistics();
console.log(
  "[vitest] heap limit (MB):",
  Math.round(heapStats.heap_size_limit / 1024 / 1024)
);

// Mock heavy font imports that aren't needed in unit tests
vi.mock("@fontsource-variable/inter/index.css", () => ({}));

// Mock @graphdown/runtime with lightweight mock that tests can override
// Use factory mode to avoid early loading of the actual module
vi.mock("@graphdown/runtime", async (importOriginal) => {
  // Only load the actual module if not in routes shard (which uses resolver aliasing)
  if (process.env.VITEST_LIGHT_ROUTES === "1") {
    // Routes shard: return minimal stub
    return {
      RUNTIME_API_VERSION_V1: 1,
      openRuntimeApiV1: vi.fn(async ({ snapshot }: { snapshot: unknown }) => ({
        ok: true,
        value: createRuntimeApiV1Mock(snapshot as Parameters<typeof createRuntimeApiV1Mock>[0])
      }))
    };
  }

  // Other shards: use real module but mock openRuntimeApiV1 for flexibility
  const actual = await importOriginal<typeof import("@graphdown/runtime")>();
  return {
    ...actual,
    openRuntimeApiV1: vi.fn(async ({ snapshot }: { snapshot: unknown }) => ({
      ok: true,
      value: createRuntimeApiV1Mock(snapshot as Parameters<typeof createRuntimeApiV1Mock>[0])
    }))
  };
});

// Helper to format memory in MB
function mb(n: number) {
  return Math.round((n / 1024 / 1024) * 10) / 10;
}

// Note: IndexedDB reset removed from global beforeEach as it breaks tests that need persistence
// Tests that need isolation should reset IndexedDB themselves

beforeAll(() => {
  const m = process.memoryUsage();
  console.log(`[mem] START heapUsed=${mb(m.heapUsed)}MB rss=${mb(m.rss)}MB`);
});

afterEach(() => {
  // Clean up React components
  cleanup();

  // Clear mocks but DON'T restore them (preserves the runtime mock)
  vi.clearAllMocks();

  // Note: Vitest config has unstubGlobals: true, so globals are restored automatically
});

afterAll(() => {
  const m = process.memoryUsage();
  console.log(`[mem] END   heapUsed=${mb(m.heapUsed)}MB rss=${mb(m.rss)}MB`);
});
