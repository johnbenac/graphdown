import "fake-indexeddb/auto";
import { act, render, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { DatasetSnapshot } from "@graphdown/dataset";
import { makeError } from "@graphdown/dataset";
import { openRuntimeApiV1 } from "@graphdown/runtime";
import { DatasetProvider, useDataset } from "../DatasetContext";
import type { DatasetContextValue } from "../DatasetContext";
import { createPersistence } from "@graphdown/persistence";
import { createPersistStore, IndexedDbStore } from "@graphdown/storage-idb";

let store: IndexedDbStore;

vi.mock("@graphdown/storage-idb", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@graphdown/storage-idb")>();
  return {
    ...actual,
    createPersistStore: () => store
  };
});

const encoder = new TextEncoder();

function makeDbName(prefix: string) {
  return `${prefix}-${Math.random().toString(16).slice(2)}`;
}

function makeSnapshot(): DatasetSnapshot {
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
  const persistence = createPersistence({
    store
  });
  const meta = {
    id: "active",
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  await persistence.saveActive({
    meta,
    snapshot
  });
}

function Harness({ onReady }: { onReady: (ctx: DatasetContextValue) => void }) {
  const ctx = useDataset();
  useEffect(() => {
    onReady(ctx);
  }, [ctx, onReady]);
  return null;
}

describe("DatasetContext non-functional requirements", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    store = new IndexedDbStore({ dbName: makeDbName("dataset-context") });
  });

  afterEach(async () => {
    global.fetch = originalFetch;
    await store?.destroy();
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
    expect(ctx!.activeDataset?.snapshot.files.size).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(ctx!.activeDataset?.runtimeApiV1).toBeDefined();
    await expect(ctx!.activeDataset!.runtimeApiV1.listTypeIds()).resolves.toContain("note");
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

  it("does not clear the persisted dataset when runtime fails to open on loadActive", async () => {
    await seedActiveDataset();

    vi.mocked(openRuntimeApiV1).mockResolvedValueOnce({
      ok: false,
      errors: [makeError("E_INTERNAL", "structuredClone is not defined")]
    });

    let ctx: DatasetContextValue | null = null;
    render(
      <DatasetProvider>
        <Harness onReady={(value) => (ctx = value)} />
      </DatasetProvider>
    );

    await waitFor(() => expect(ctx?.status).toBe("error"));

    const freshStore = createPersistStore({ logger: console });
    const persistence = createPersistence({ store: freshStore });
    const stillThere = await persistence.loadActive();

    expect(stillThere).toBeTruthy();
    expect(stillThere?.snapshot.files.size).toBeGreaterThan(0);
  });
});
