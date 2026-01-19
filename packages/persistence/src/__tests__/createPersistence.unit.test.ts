import { describe, expect, it } from "vitest";
import type { DatasetSnapshot } from "@graphdown/core";
import { MemoryPersistStore } from "../store/memoryStore";
import { createPersistence } from "../createPersistence";
import { KEY } from "../keys";

const encoder = new TextEncoder();

function makeSnapshot(): DatasetSnapshot {
  return {
    files: new Map([["types/note.md", encoder.encode("note")]])
  };
}

describe("createPersistence", () => {
  it("returns null when no active dataset is stored", async () => {
    const persistence = createPersistence({ store: new MemoryPersistStore() });
    await expect(persistence.loadActive()).resolves.toBeNull();
  });

  it("saves and loads the active dataset", async () => {
    const store = new MemoryPersistStore();
    const persistence = createPersistence({ store });
    const snapshot = makeSnapshot();
    const meta = { id: "active", createdAt: 1, updatedAt: 2 };

    await persistence.saveActive({ meta, snapshot });

    const loaded = await persistence.loadActive();
    expect(loaded?.meta).toEqual(meta);
    expect(loaded?.datasetSnapshot.files.size).toBe(1);
  });

  it("clears the active dataset", async () => {
    const store = new MemoryPersistStore();
    const persistence = createPersistence({ store });
    await persistence.saveActive({
      meta: { id: "active", createdAt: 1, updatedAt: 2 },
      snapshot: makeSnapshot()
    });

    await persistence.clearActive();

    await expect(persistence.loadActive()).resolves.toBeNull();
  });

  it("removes corrupt persisted records", async () => {
    const store = new MemoryPersistStore();
    await store.set(KEY.activeDataset, { version: 1, snapshot: null });
    const persistence = createPersistence({ store });

    await expect(persistence.loadActive()).resolves.toBeNull();
    await expect(store.get(KEY.activeDataset)).resolves.toBeUndefined();
  });
});
