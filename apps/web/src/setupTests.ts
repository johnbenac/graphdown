import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { afterEach, vi } from "vitest";
import type { DatasetSnapshot } from "@graphdown/core";
import { createRuntimeApiV1Mock } from "./testUtils/runtimeApiV1Mock";

vi.mock("@graphdown/runtime", () => {
  return {
    openRuntimeApiV1: vi.fn(async ({ snapshot }: { snapshot: unknown }) => {
      return { ok: true, value: createRuntimeApiV1Mock(snapshot as DatasetSnapshot | undefined) };
    })
  };
});

afterEach(() => {
  vi.clearAllMocks();
});
