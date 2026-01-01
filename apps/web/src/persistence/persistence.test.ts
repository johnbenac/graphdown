import { describe, expect, it, vi } from "vitest";
import type { GraphNode } from "../../../../src/core/graph";
import type { RepoSnapshot } from "../../../../src/core/snapshotTypes";
import { MemoryStore } from "../storage/MemoryStore";
import { KEY } from "./keys";
import { createPersistence } from "./persistence";
import { deserializeGraph } from "./serializeGraph";
import { serializeSnapshot } from "./serializeSnapshot";
import type { PersistedGraph } from "./types";
import { FORMAT_VERSIONS } from "./versions";

const sampleSnapshot: RepoSnapshot = {
  files: new Map([
    [
      "types/note.md",
      new TextEncoder().encode(
        "---\nid: type:note\ntypeId: sys:type\ncreatedAt: 2024-01-01\nupdatedAt: 2024-01-01\nfields:\n  recordTypeId: note\n---\nDemo"
      )
    ]
  ])
};

const sampleGraphNode: GraphNode = {
  id: "type:note",
  typeId: "sys:type",
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
  fields: { recordTypeId: "note" },
  body: "Demo",
  file: "types/note.md",
  kind: "type"
};

const samplePersistedGraph: PersistedGraph = {
  nodes: [sampleGraphNode],
  types: [],
  outgoing: [],
  incoming: []
};

describe("persistence service", () => {
  it("saves and loads the active dataset", async () => {
    const store = new MemoryStore();
    const persistence = createPersistence({ store });
    const datasetId = "dataset-1";

    await persistence.saveDataset({
      datasetId,
      meta: {
        id: datasetId,
        createdAt: 1,
        updatedAt: 1,
        snapshotFormatVersion: FORMAT_VERSIONS.snapshot,
        graphFormatVersion: FORMAT_VERSIONS.graph,
        uiStateFormatVersion: FORMAT_VERSIONS.uiState
      },
      repoSnapshot: sampleSnapshot,
      parsedGraph: deserializeGraph(samplePersistedGraph)
    });
    await persistence.setActiveDatasetId(datasetId);

    const loaded = await persistence.loadActiveDataset();
    expect(loaded?.meta.id).toBe(datasetId);
    expect(loaded?.repoSnapshot.files.size).toBe(1);
    expect(loaded?.parsedGraph?.nodesById.size).toBe(1);
  });

  it("rebuilds the graph when the format version changes", async () => {
    const store = new MemoryStore();
    const parseGraph = vi.fn(async () => deserializeGraph(samplePersistedGraph));
    const persistence = createPersistence({ store, parseGraph });
    const datasetId = "dataset-2";

    await store.set(KEY.repoSnapshot(datasetId), serializeSnapshot(sampleSnapshot));
    await store.set(KEY.datasetMeta(datasetId), {
      id: datasetId,
      createdAt: 1,
      updatedAt: 1,
      snapshotFormatVersion: FORMAT_VERSIONS.snapshot,
      graphFormatVersion: 0,
      uiStateFormatVersion: FORMAT_VERSIONS.uiState
    });
    await persistence.setActiveDatasetId(datasetId);

    const loaded = await persistence.loadActiveDataset();
    expect(parseGraph).toHaveBeenCalledOnce();
    expect(loaded?.parsedGraph?.nodesById.size).toBe(1);
  });

  it("clears the active dataset when records are missing", async () => {
    const store = new MemoryStore();
    const persistence = createPersistence({ store });
    await persistence.setActiveDatasetId("missing");

    const loaded = await persistence.loadActiveDataset();
    expect(loaded).toBeUndefined();
    expect(await persistence.getActiveDatasetId()).toBeUndefined();
  });
});
