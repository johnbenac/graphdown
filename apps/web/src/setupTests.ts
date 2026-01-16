import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { createRuntimeApiV1Mock } from "./testUtils/runtimeApiV1Mock";
import { deleteTrackedDbNames } from "./storage/IndexedDbStore";

let consoleWarnSpy: ReturnType<typeof vi.spyOn> | null = null;
let consoleErrorSpy: ReturnType<typeof vi.spyOn> | null = null;

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

beforeEach(async () => {
  const runtime = await import("@graphdown/runtime");
  vi.mocked(runtime.openRuntimeApiV1).mockImplementation(async ({ snapshot }: { snapshot: unknown }) => ({
    ok: true,
    value: createRuntimeApiV1Mock(snapshot as Parameters<typeof createRuntimeApiV1Mock>[0])
  }));
});

beforeEach(() => {
  consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  consoleWarnSpy?.mockRestore();
  consoleErrorSpy?.mockRestore();
  consoleWarnSpy = null;
  consoleErrorSpy = null;
  return deleteTrackedDbNames();
});
