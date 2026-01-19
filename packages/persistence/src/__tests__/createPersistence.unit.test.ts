import { describe, expect, it } from "vitest";
import type { DatasetSnapshot } from "@graphdown/core";
import { createPersistence } from "../createPersistence";
import { KEY } from "../keys";
import { MemoryPersistStore } from "../store/memoryStore";

const sampleSnapshot: DatasetSnapshot = {
  files: new Map([
    ["types/note.md", Uint8Array.from([1, 2, 3])],
    ["records/note/one.md", Uint8Array.from([4, 5, 6])]
  ])
};

describe("createPersistence", () => {
  it("returns null when no active dataset exists", async () => {
    const store = new MemoryPersistStore();
    const persistence = createPersistence({ store });

    await expect(persistence.loadActive()).resolves.toBeNull();
  });

  it("saves and loads the active dataset", async () => {
    const store = new MemoryPersistStore();
    const persistence = createPersistence({ store });

    await persistence.saveActive({
      meta: { id: "dataset-1", createdAt: 1, updatedAt: 2 },
      snapshot: sampleSnapshot
    });

    const loaded = await persistence.loadActive();
    expect(loaded?.meta.id).toBe("dataset-1");
    expect(loaded?.snapshot.files.size).toBe(2);
  });

  it("clears the active dataset", async () => {
    const store = new MemoryPersistStore();
    const persistence = createPersistence({ store });

    await persistence.saveActive({
      meta: { id: "dataset-1", createdAt: 1, updatedAt: 2 },
      snapshot: sampleSnapshot
    });

    await persistence.clearActive();
    await expect(store.get(KEY.activeMeta)).resolves.toBeUndefined();
    await expect(store.get(KEY.activeSnapshot)).resolves.toBeUndefined();
  });

  it("clears corrupt data when loading", async () => {
    const store = new MemoryPersistStore();
    const persistence = createPersistence({ store });

    await store.set(KEY.activeMeta, { id: "dataset-1", createdAt: 1, updatedAt: 2 });
    await store.set(KEY.activeSnapshot, { files: [["bad", "payload"]] });

    await expect(persistence.loadActive()).resolves.toBeNull();
    await expect(store.get(KEY.activeMeta)).resolves.toBeUndefined();
    await expect(store.get(KEY.activeSnapshot)).resolves.toBeUndefined();
  });
});
