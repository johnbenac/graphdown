import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { afterEach, vi } from "vitest";
import { createRuntimeApiV1Mock } from "./testUtils/runtimeApiV1Mock";

vi.mock("@graphdown/runtime", async () => {
  const actual = await vi.importActual<typeof import("@graphdown/runtime")>("@graphdown/runtime");
  return {
    ...actual,
    openRuntimeApiV1: vi.fn(async ({ snapshot }: { snapshot: unknown }) => ({
      ok: true,
      value: createRuntimeApiV1Mock(snapshot as Parameters<typeof createRuntimeApiV1Mock>[0])
    }))
  };
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
