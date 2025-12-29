import { describe, expect, it } from "vitest";
import { MemoryStore } from "../storage/MemoryStore";
import { KEY } from "./keys";
import { createPersistence } from "./persistence";
import { FORMAT_VERSIONS } from "./versions";
import type { DatasetMeta, RepoSnapshot } from "./types";

describe("persistence service", () => {
  it("saves and loads the active dataset", async () => {
    const store = new MemoryStore();
    const persistence = createPersistence(store);
    const snapshot: RepoSnapshot = {
      fileName: "dataset.zip",
      bytes: [1, 2, 3],
      importedAt: 1700000000000,
    };
    const meta: DatasetMeta = {
      id: "dataset-1",
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
      snapshotFormatVersion: FORMAT_VERSIONS.snapshot,
      graphFormatVersion: FORMAT_VERSIONS.graph,
      uiStateFormatVersion: FORMAT_VERSIONS.uiState,
      label: "Dataset 1",
      source: "import",
    };

    await persistence.saveDataset({
      datasetId: meta.id,
      meta,
      repoSnapshot: snapshot,
      parsedGraph: { nodeCount: 0, edgeCount: 0, summary: "Summary" },
    });
    await persistence.setActiveDatasetId(meta.id);

    const loaded = await persistence.loadActiveDataset();
    expect(loaded).toBeDefined();
    expect(loaded?.meta).toEqual(meta);
    expect(loaded?.repoSnapshot).toEqual(snapshot);
    expect(loaded?.parsedGraph?.summary).toBe("Summary");
  });

  it("drops parsed graph when the format version mismatches", async () => {
    const store = new MemoryStore();
    const persistence = createPersistence(store);
    const datasetId = "dataset-2";
    const meta: DatasetMeta = {
      id: datasetId,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
      snapshotFormatVersion: FORMAT_VERSIONS.snapshot,
      graphFormatVersion: FORMAT_VERSIONS.graph + 1,
      uiStateFormatVersion: FORMAT_VERSIONS.uiState,
    };
    const snapshot: RepoSnapshot = {
      fileName: "dataset.zip",
      bytes: [1, 2, 3],
      importedAt: 1700000000000,
    };

    await store.set(KEY.datasetMeta(datasetId), meta);
    await store.set(KEY.repoSnapshot(datasetId), snapshot);
    await store.set(KEY.parsedGraph(datasetId), { nodeCount: 1, edgeCount: 1, summary: "Old" });
    await store.set(KEY.activeDatasetId, datasetId);

    const loaded = await persistence.loadActiveDataset();
    expect(loaded?.parsedGraph).toBeUndefined();
    expect(await store.get(KEY.parsedGraph(datasetId))).toBeUndefined();
  });

  it("clears active pointer when records are missing", async () => {
    const store = new MemoryStore();
    const persistence = createPersistence(store);

    await store.set(KEY.activeDatasetId, "dataset-missing");

    const loaded = await persistence.loadActiveDataset();
    expect(loaded).toBeUndefined();
    expect(await store.get(KEY.activeDatasetId)).toBeUndefined();
  });
});
