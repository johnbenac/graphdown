import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import type { DatasetSnapshot } from "@graphdown/dataset";
import { createPersistence, KEY } from "@graphdown/persistence";
import { IndexedDbStore } from "@graphdown/storage-idb";

function makeDbName(prefix: string) {
  return `${prefix}-${Math.random().toString(16).slice(2)}`;
}

const sampleSnapshot: DatasetSnapshot = {
  files: new Map([
    [
      "types/note.md",
      new TextEncoder().encode(
        "---\ntypeId: note\nfields:\n  name: Note\n---\nDemo"
      )
    ]
  ])
};

describe("persistence service", () => {
  it("saves and loads the active dataset", async () => {
    const store = new IndexedDbStore({ dbName: makeDbName("persistence") });
    try {
      const persistence = createPersistence({ store });

      await persistence.saveActive({
        meta: {
          id: "dataset-1",
          createdAt: 1,
          updatedAt: 1
        },
        snapshot: sampleSnapshot
      });

      const loaded = await persistence.loadActive();
      expect(loaded?.meta.id).toBe("dataset-1");
      expect(loaded?.snapshot.files.size).toBe(1);
    } finally {
      await store.destroy();
    }
  });

  it("clears the active dataset when snapshot or meta is missing", async () => {
    const store = new IndexedDbStore({ dbName: makeDbName("persistence") });
    try {
      const persistence = createPersistence({ store });

      await store.set(KEY.activeMeta, {
        id: "dataset-3",
        createdAt: 1,
        updatedAt: 1
      });

      const loaded = await persistence.loadActive();
      expect(loaded).toBeNull();
      await expect(store.get(KEY.activeMeta)).resolves.toBeUndefined();
      await expect(store.get(KEY.activeSnapshot)).resolves.toBeUndefined();
    } finally {
      await store.destroy();
    }
  });
});
