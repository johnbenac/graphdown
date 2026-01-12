import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import type { RecordLinkGraphTypeNode } from "@graphdown/core";
import type { DatasetSnapshot } from "@graphdown/core";
import { IndexedDbStore } from "../../storage/IndexedDbStore";
import { KEY } from "../keys";
import { createPersistence } from "../persistence";
import { deserializeRecordLinkGraphCache } from "../serializeRecordLinkGraphCache";
import { serializeSnapshot } from "../serializeSnapshot";
import type { PersistedRecordLinkGraphCache } from "../types";

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

const sampleType: RecordLinkGraphTypeNode = {
  kind: "type",
  typeId: "note",
  fields: { name: "Note" },
  body: "Demo",
  file: "types/note.md"
};

const samplePersistedGraph: PersistedRecordLinkGraphCache = {
  types: [sampleType],
  records: [],
  outgoing: [],
  incoming: []
};

describe("persistence service", () => {
  it("saves and loads the active dataset", async () => {
    const store = new IndexedDbStore({ dbName: makeDbName("persistence") });
    const persistence = createPersistence({ store });

    await persistence.saveActiveDataset({
      meta: {
        id: "dataset-1",
        createdAt: 1,
        updatedAt: 1
      },
      datasetSnapshot: sampleSnapshot,
      recordLinkGraph: deserializeRecordLinkGraphCache(samplePersistedGraph)
    });

    const loaded = await persistence.loadActiveDataset();
    expect(loaded?.meta.id).toBe("dataset-1");
    expect(loaded?.datasetSnapshot.files.size).toBe(1);
    expect(loaded?.recordLinkGraph?.nodesByIdentity.size).toBe(1);
  });

  it("clears the active dataset when the graph cache is missing", async () => {
    const store = new IndexedDbStore({ dbName: makeDbName("persistence") });
    const persistence = createPersistence({ store });

    await store.set(KEY.activeSnapshot, serializeSnapshot(sampleSnapshot));
    await store.set(KEY.activeMeta, {
      id: "dataset-2",
      createdAt: 1,
      updatedAt: 1
    });

    const loaded = await persistence.loadActiveDataset();
    expect(loaded).toBeUndefined();
    await expect(store.get(KEY.activeMeta)).resolves.toBeUndefined();
    await expect(store.get(KEY.activeSnapshot)).resolves.toBeUndefined();
  });

  it("clears the active dataset when records are missing", async () => {
    const store = new IndexedDbStore({ dbName: makeDbName("persistence") });
    const persistence = createPersistence({ store });

    await store.set(KEY.activeRecordLinkGraphCache, samplePersistedGraph);
    await store.set(KEY.activeMeta, {
      id: "dataset-3",
      createdAt: 1,
      updatedAt: 1
    });

    const loaded = await persistence.loadActiveDataset();
    expect(loaded).toBeUndefined();
    await expect(store.get(KEY.activeMeta)).resolves.toBeUndefined();
    await expect(store.get(KEY.activeRecordLinkGraphCache)).resolves.toBeUndefined();
    await expect(store.get(KEY.activeSnapshot)).resolves.toBeUndefined();
  });
});
