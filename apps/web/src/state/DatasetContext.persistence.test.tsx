import { render, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DatasetProvider, useDataset } from "./DatasetContext";

function Harness({ onReady }: { onReady: (ctx: ReturnType<typeof useDataset>) => void }) {
  const ctx = useDataset();
  useEffect(() => {
    onReady(ctx);
  }, [ctx, onReady]);
  return null;
}

describe("DatasetProvider persistence requirements", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("NFR-PERSIST-001: fails loud when IndexedDB is unavailable", async () => {
    vi.stubGlobal("indexedDB", undefined);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    let ctx: ReturnType<typeof useDataset> | null = null;
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
