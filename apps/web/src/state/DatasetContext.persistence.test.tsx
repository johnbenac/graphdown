import { render, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DatasetProvider, useDataset } from "./DatasetContext";
import type { DatasetContextValue } from "./DatasetContext";

function Harness({ onReady }: { onReady: (ctx: ReturnType<typeof useDataset>) => void }) {
  const ctx = useDataset();
  useEffect(() => {
    onReady(ctx);
  }, [ctx, onReady]);
  return null;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("DatasetContext persistence requirements", () => {
  it("NFR-PERSIST-001: surfaces persistence unavailable on startup", async () => {
    vi.stubGlobal("indexedDB", undefined);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    let ctx: DatasetContextValue | null = null;
    render(
      <DatasetProvider>
        <Harness onReady={(value) => (ctx = value)} />
      </DatasetProvider>
    );

    await waitFor(() => expect(ctx?.status).toBe("error"));
    expect(ctx?.error?.category).toBe("persistence_unavailable");
    expect(errorSpy).toHaveBeenCalled();
  });
});
