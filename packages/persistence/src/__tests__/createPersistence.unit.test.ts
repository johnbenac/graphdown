import { describe, expect, it } from "vitest";
import type { DatasetSnapshot } from "@graphdown/core";
import { createPersistence } from "../createPersistence";
import { MemoryPersistStore } from "../store/memoryStore";

const encoder = new TextEncoder();

function makeSnapshot(): DatasetSnapshot {
  return {
    files: new Map([[
      "types/note.md",
      encoder.encode("---\ntypeId: note\nfields: {}\n---")
    ]])
  };
}

describe("createPersistence", () => {
  it("returns null when no active dataset is stored", async () => {
    const store = new MemoryPersistStore();
    const persistence = createPersistence(store);

    await expect(persistence.loadActive()).resolves.toBeNull();
  });

  it("saves and loads the active dataset", async () => {
    const store = new MemoryPersistStore();
    const persistence = createPersistence(store);
    const snapshot = makeSnapshot();

    await persistence.saveActive({
      snapshot,
      meta: {
        id: "active",
        createdAt: 123,
        updatedAt: 456
      }
    });

    const loaded = await persistence.loadActive();
    expect(loaded).not.toBeNull();
    expect(loaded?.meta.id).toBe("active");
    expect(loaded?.meta.updatedAt).toBe(456);
    expect(loaded?.snapshot.files.size).toBe(1);
  });

  it("clears the active dataset", async () => {
    const store = new MemoryPersistStore();
    const persistence = createPersistence(store);

    await persistence.saveActive({
      snapshot: makeSnapshot(),
      meta: {
        id: "active",
        createdAt: 1,
        updatedAt: 2
      }
    });

    await persistence.clearActive();
    await expect(persistence.loadActive()).resolves.toBeNull();
  });

  it("drops corrupt persisted data and deletes the record", async () => {
    const store = new MemoryPersistStore();
    await store.set("active:dataset", { version: 1, snapshot: { files: [] } });

    const persistence = createPersistence(store);
    await expect(persistence.loadActive()).resolves.toBeNull();
    await expect(store.get("active:dataset")).resolves.toBeUndefined();
  });
});
