import type { RepoSnapshot } from "@graphdown/core";
import { parseGraphFromSnapshot } from "./parseGraph";
import { createDatasetMeta, createPersistence } from "./persistence";
import { FORMAT_VERSIONS } from "./versions";
import MemoryStore from "../storage/MemoryStore";
import { KEY } from "./keys";

function buildSnapshot(): RepoSnapshot {
  const encoder = new TextEncoder();
  const contents = encoder.encode(
    `---\n` +
      `id: dataset-1\n` +
      `datasetId: dataset-1\n` +
      `typeId: sys:dataset\n` +
      `createdAt: 2024-01-01\n` +
      `updatedAt: 2024-01-01\n` +
      `fields: {}\n` +
      `---\n` +
      `Dataset body`
  );
  return {
    files: new Map([["datasets/dataset.md", contents]]),
  };
}

describe("persistence service", () => {
  it("saves and loads the active dataset", async () => {
    const store = new MemoryStore();
    const persistence = createPersistence(store, { parseGraph: parseGraphFromSnapshot });
    const snapshot = buildSnapshot();
    const graph = parseGraphFromSnapshot(snapshot);
    const meta = createDatasetMeta({ id: "dataset-1", label: "Demo" });

    await persistence.saveDataset({
      datasetId: meta.id,
      meta,
      repoSnapshot: snapshot,
      parsedGraph: graph,
    });

    const loaded = await persistence.loadActiveDataset();
    expect(loaded).toBeDefined();
    expect(loaded?.meta.id).toBe(meta.id);
    expect(loaded?.repoSnapshot.files.size).toBe(1);
    expect(loaded?.parsedGraph?.nodesById.size).toBe(graph.nodesById.size);
  });

  it("reparses graph when the format version changes", async () => {
    const store = new MemoryStore();
    let parseCount = 0;
    const persistence = createPersistence(store, {
      parseGraph: (snapshot) => {
        parseCount += 1;
        return parseGraphFromSnapshot(snapshot);
      },
    });
    const snapshot = buildSnapshot();
    const graph = parseGraphFromSnapshot(snapshot);
    const meta = createDatasetMeta({ id: "dataset-1" });

    await persistence.saveDataset({
      datasetId: meta.id,
      meta,
      repoSnapshot: snapshot,
      parsedGraph: graph,
    });

    const storedMeta = await store.get(KEY.datasetMeta(meta.id));
    await store.set(KEY.datasetMeta(meta.id), {
      ...storedMeta,
      graphFormatVersion: FORMAT_VERSIONS.graph - 1,
    });

    const loaded = await persistence.loadActiveDataset();
    expect(loaded?.parsedGraph).toBeDefined();
    expect(parseCount).toBeGreaterThan(0);
  });

  it("clears the active pointer when snapshot is missing", async () => {
    const store = new MemoryStore();
    const persistence = createPersistence(store, { parseGraph: parseGraphFromSnapshot });

    await store.set(KEY.activeDatasetId, "dataset-1");

    const loaded = await persistence.loadActiveDataset();
    expect(loaded).toBeUndefined();
    expect(await store.get(KEY.activeDatasetId)).toBeUndefined();
  });
});
