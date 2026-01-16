import { vi } from "vitest";
import { createRuntimeApiV1Mock } from "../testUtils/runtimeApiV1Mock";

export const RUNTIME_API_VERSION_V1 = 1;

export const openRuntimeApiV1 = vi.fn(async ({ snapshot }: { snapshot: unknown }) => ({
  ok: true,
  value: createRuntimeApiV1Mock(snapshot as any),
}));
