import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import type { DatasetSnapshot } from "@graphdown/core";
import { IndexedDbStore } from "../../storage/IndexedDbStore";
import { KEY } from "../keys";
import { createPersistence } from "../persistence";
import { serializeSnapshot } from "../serializeSnapshot";

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

      await persistence.saveActiveDataset({
        meta: {
          id: "dataset-1",
          createdAt: 1,
          updatedAt: 1
        },
        datasetSnapshot: sampleSnapshot
      });

      const loaded = await persistence.loadActiveDataset();
      expect(loaded?.meta.id).toBe("dataset-1");
      expect(loaded?.datasetSnapshot.files.size).toBe(1);
    } finally {
      await store.destroy();
    }
  });

  it("loads datasets even when legacy graph cache entries exist", async () => {
    const store = new IndexedDbStore({ dbName: makeDbName("persistence") });
    try {
      const persistence = createPersistence({ store });

      await store.set(KEY.activeSnapshot, serializeSnapshot(sampleSnapshot));
      await store.set(KEY.activeMeta, {
        id: "dataset-2",
        createdAt: 1,
        updatedAt: 1
      });
      await store.set(KEY.activeRecordLinkGraphCache, { legacy: true });

      const loaded = await persistence.loadActiveDataset();
      expect(loaded?.meta.id).toBe("dataset-2");
      expect(loaded?.datasetSnapshot.files.size).toBe(1);
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

      const loaded = await persistence.loadActiveDataset();
      expect(loaded).toBeUndefined();
      await expect(store.get(KEY.activeMeta)).resolves.toBeUndefined();
      await expect(store.get(KEY.activeSnapshot)).resolves.toBeUndefined();
    } finally {
      await store.destroy();
    }
  });
});
