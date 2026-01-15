import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import type { DatasetSnapshot } from "@graphdown/core";
import { afterEach, vi } from "vitest";
import { createRuntimeApiV1Mock } from "./testUtils/runtimeApiV1Mock";

vi.mock("@graphdown/runtime", () => {
  return {
    openRuntimeApiV1: vi.fn(async ({ snapshot }: { snapshot: DatasetSnapshot }) => {
      return { ok: true as const, value: createRuntimeApiV1Mock(snapshot) };
    })
  };
});

afterEach(() => {
  vi.clearAllMocks();
});
