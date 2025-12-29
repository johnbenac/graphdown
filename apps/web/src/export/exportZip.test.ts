import { describe, expect, it } from "vitest";
import { strToU8 } from "fflate";
import type { RepoSnapshot } from "../../../../src/core/snapshotTypes";
import { readZipSnapshot } from "../import/readZipSnapshot";
import { exportDatasetOnlyZip, exportWholeSnapshotZip } from "./exportZip";

function snapshotFromEntries(entries: Array<[string, string]>): RepoSnapshot {
  return {
    files: new Map(entries.map(([path, contents]) => [path, new Uint8Array(strToU8(contents))]))
  };
}

async function readSnapshotFromZipBytes(bytes: Uint8Array): Promise<RepoSnapshot> {
  const buffer = Uint8Array.from(bytes).buffer;
  const file = {
    arrayBuffer: async () => buffer
  } as File;
  return readZipSnapshot(file);
}

describe("exportZip", () => {
  it("round-trips whole snapshot exports", async () => {
    const snapshot = snapshotFromEntries([
      ["datasets/demo.md", "---\nid: dataset:demo\n---"],
      ["types/note.md", "---\nid: type:note\n---"],
      ["records/note/record-1.md", "---\nid: record:1\n---"],
      ["assets/info.txt", "hello"],
      [".git/config", "ignored"]
    ]);

    const exported = exportWholeSnapshotZip(snapshot);
    const imported = await readSnapshotFromZipBytes(exported);

    expect(imported.files.size).toBe(4);
    for (const [path, contents] of snapshot.files) {
      if (path.startsWith(".git/")) {
        expect(imported.files.has(path)).toBe(false);
        continue;
      }
      expect(imported.files.has(path)).toBe(true);
      expect(imported.files.get(path)).toEqual(contents);
    }
  });

  it("exports dataset-only markdown for datasets, types, and records", async () => {
    const snapshot = snapshotFromEntries([
      ["datasets/demo.md", "---\nid: dataset:demo\n---"],
      ["types/note.md", "---\nid: type:note\n---"],
      ["records/note/record-1.md", "---\nid: record:1\n---"],
      ["datasets/README.txt", "skip"],
      ["assets/info.md", "skip"]
    ]);

    const exported = exportDatasetOnlyZip(snapshot);
    const imported = await readSnapshotFromZipBytes(exported);

    expect([...imported.files.keys()].sort()).toEqual([
      "datasets/demo.md",
      "records/note/record-1.md",
      "types/note.md"
    ]);
  });
});
