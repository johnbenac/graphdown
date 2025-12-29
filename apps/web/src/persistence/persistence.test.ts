import { describe, expect, it } from "vitest";
import { MemoryStore } from "../storage/MemoryStore";
import { KEY } from "./keys";
import { createPersistence } from "./persistence";
import { serializeRepoSnapshot } from "./serializeSnapshot";
import { FORMAT_VERSIONS } from "./versions";
import type { DatasetMeta, PersistedParsedGraph, RepoSnapshot } from "./types";

const createSnapshot = (): RepoSnapshot => ({
  files: new Map([
    ["README.md", new Uint8Array([1, 2, 3])],
    ["records/example.md", new Uint8Array([4, 5])],
  ]),
});

const createMeta = (id: string): DatasetMeta => ({
  id,
  label: "demo.zip",
  source: "import",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  snapshotFormatVersion: FORMAT_VERSIONS.snapshot,
  graphFormatVersion: FORMAT_VERSIONS.graph,
  uiStateFormatVersion: FORMAT_VERSIONS.uiState,
});

describe("persistence service", () => {
  it("saves and loads active dataset", async () => {
    const store = new MemoryStore();
    const parsedGraph: PersistedParsedGraph = {
      nodes: [{ id: "README.md", file: "README.md" }],
      edges: [],
    };
    const persistence = createPersistence(store, {
      parseGraph: async () => parsedGraph,
    });

    const snapshot = createSnapshot();
    const meta = createMeta("dataset-1");

    await persistence.saveDataset({
      datasetId: meta.id,
      meta,
      repoSnapshot: snapshot,
      parsedGraph,
    });

    const loaded = await persistence.loadActiveDataset();
    expect(loaded?.meta.id).toBe(meta.id);
    expect(loaded?.repoSnapshot.files.size).toBe(snapshot.files.size);
    expect(loaded?.parsedGraph?.nodes).toHaveLength(1);
  });

  it("reparses graph when graph format version changes", async () => {
    const store = new MemoryStore();
    const snapshot = createSnapshot();
    const parsedGraph: PersistedParsedGraph = {
      nodes: [{ id: "old", file: "old" }],
      edges: [],
    };
    const replacementGraph: PersistedParsedGraph = {
      nodes: [{ id: "new", file: "new" }],
      edges: [],
    };
    const persistence = createPersistence(store, {
      parseGraph: async () => replacementGraph,
    });

    const meta = createMeta("dataset-2");
    await store.set(KEY.datasetMeta(meta.id), {
      ...meta,
      graphFormatVersion: FORMAT_VERSIONS.graph - 1,
    });
    await store.set(KEY.repoSnapshot(meta.id), serializeRepoSnapshot(snapshot));
    await store.set(KEY.parsedGraph(meta.id), parsedGraph);
    await store.set(KEY.activeDatasetId, meta.id);

    const loaded = await persistence.loadActiveDataset();
    expect(loaded?.parsedGraph?.nodes[0]?.id).toBe("new");
  });

  it("clears active dataset when snapshot is missing", async () => {
    const store = new MemoryStore();
    const meta = createMeta("dataset-3");
    await store.set(KEY.datasetMeta(meta.id), meta);
    await store.set(KEY.activeDatasetId, meta.id);

    const persistence = createPersistence(store);
    const loaded = await persistence.loadActiveDataset();
    expect(loaded).toBeUndefined();
    await expect(store.get(KEY.activeDatasetId)).resolves.toBeUndefined();
  });
});
