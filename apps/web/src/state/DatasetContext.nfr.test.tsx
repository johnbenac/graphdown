import { act, render, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { RepoSnapshot } from "../../../../src/core/snapshotTypes";
import { buildGraphFromSnapshot } from "../../../../src/core/graph";
import { DatasetProvider, useDataset } from "./DatasetContext";
import type { DatasetContextValue } from "./DatasetContext";
import { MemoryStore } from "../storage/MemoryStore";
import { createPersistence } from "../persistence/persistence";
import { FORMAT_VERSIONS } from "../persistence/versions";

let store: MemoryStore;

vi.mock("../storage/createPersistStore", () => ({
  createPersistStore: () => store
}));

const encoder = new TextEncoder();

function makeSnapshot(): RepoSnapshot {
  return {
    files: new Map<string, Uint8Array>([
      ["types/note.md", encoder.encode(["---", "typeId: note", "fields: {}", "---", ""].join("\n"))],
      [
        "records/note/one.md",
        encoder.encode(["---", "typeId: note", "recordId: one", "fields: {}", "---", "Body"].join("\n"))
      ]
    ])
  };
}

async function seedActiveDataset() {
  if (!store) throw new Error("Persist store not initialized");
  const snapshot = makeSnapshot();
  const graphResult = buildGraphFromSnapshot(snapshot);
  if (!graphResult.ok) {
    throw new Error(`Graph build failed: ${JSON.stringify(graphResult.errors)}`);
  }
  const persistence = createPersistence({
    store,
    parseGraph: async () => graphResult.graph
  });
  const meta = {
    id: "dataset-nfr",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    snapshotFormatVersion: FORMAT_VERSIONS.snapshot,
    graphFormatVersion: FORMAT_VERSIONS.graph,
    uiStateFormatVersion: FORMAT_VERSIONS.uiState
  };
  await persistence.saveDataset({
    datasetId: meta.id,
    meta,
    repoSnapshot: snapshot,
    parsedGraph: graphResult.graph
  });
  await persistence.setActiveDatasetId(meta.id);
}

function Harness({ onReady }: { onReady: (ctx: ReturnType<typeof useDataset>) => void }) {
  const ctx = useDataset();
  useEffect(() => {
    onReady(ctx);
  }, [ctx, onReady]);
  return null;
}

describe("DatasetContext non-functional requirements", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    store = new MemoryStore();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("NFR-010: uses persisted dataset for read-only access when offline", async () => {
    const fetchMock = vi.fn(() => Promise.reject(new TypeError("offline")));
    global.fetch = fetchMock as unknown as typeof fetch;
    await seedActiveDataset();

    let ctx: DatasetContextValue | null = null;
    render(
      <DatasetProvider>
        <Harness onReady={(value) => (ctx = value)} />
      </DatasetProvider>
    );

    await waitFor(() => expect(ctx?.status).toBe("ready"));
    expect(ctx).not.toBeNull();
    expect(ctx!.activeDataset?.repoSnapshot.files.size).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("NFR-001: CRUD actions do not trigger a full document load event", async () => {
    await seedActiveDataset();
    const loadSpy = vi.fn();
    window.addEventListener("load", loadSpy);
    window.dispatchEvent(new Event("load"));

    let ctx: DatasetContextValue | null = null;
    render(
      <DatasetProvider>
        <Harness onReady={(value) => (ctx = value)} />
      </DatasetProvider>
    );

    await waitFor(() => expect(ctx?.status).toBe("ready"));
    expect(loadSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      await ctx?.createRecord({
        typeId: "note",
        recordId: "note-2",
        fields: { title: "Second" },
        body: "Second body"
      });
      await ctx?.updateRecord({
        recordKey: "note:one",
        nextFields: { title: "Updated" },
        nextBody: "Updated body"
      });
    });

    expect(loadSpy).toHaveBeenCalledTimes(1);
  });
});
