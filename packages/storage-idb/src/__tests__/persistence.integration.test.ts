import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { createPersistence } from "@graphdown/persistence";
import { IndexedDbStore } from "../indexedDbStore";

function makeDbName(prefix: string) {
  return `${prefix}-${Math.random().toString(16).slice(2)}`;
}

describe("integration: persistence <-> storage-idb", () => {
  it("saves and loads an active dataset using IndexedDbStore", async () => {
    const store = new IndexedDbStore({ dbName: makeDbName("persistence-idb") });
    try {
      const persistence = createPersistence({ store });

      const snapshot = {
        files: new Map([[
          "types/note.md",
          new TextEncoder().encode("---\ntypeId: note\nfields: {}\n---\n")
        ]])
      };

      await persistence.saveActive({
        meta: { id: "dataset-1", createdAt: 1, updatedAt: 2 },
        snapshot
      });

      const loaded = await persistence.loadActive();
      expect(loaded).not.toBeNull();
      expect(loaded?.meta.id).toBe("dataset-1");
      expect(loaded?.snapshot.files.has("types/note.md")).toBe(true);

      await persistence.clearActive();
      await expect(persistence.loadActive()).resolves.toBeNull();
    } finally {
      await store.destroy();
    }
  });
});
