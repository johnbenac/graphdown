import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { afterEach, vi } from "vitest";
import { createRuntimeApiV1Mock } from "./testUtils/runtimeApiV1Mock";

vi.mock("@graphdown/runtime", () => ({
  openRuntimeApiV1: vi.fn(async ({ snapshot }: { snapshot: any }) => ({
    ok: true,
    value: createRuntimeApiV1Mock(snapshot)
  }))
}));

afterEach(() => {
  vi.clearAllMocks();
});
