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

describe("exportZip", () => {
  it("round-trips the full snapshot through zip export and import", async () => {
    const snapshot = snapshotFromEntries([
      ["datasets/demo.md", "---\nid: dataset:demo\n---"],
      ["types/note.md", "---\nid: type:note\n---"],
      ["records/note/record-1.md", "---\nid: record:1\n---"],
      ["assets/info.txt", "extra"],
      [".git/config", "ignored"]
    ]);

    const zipBytes = exportWholeSnapshotZip(snapshot);
    const file = { arrayBuffer: async () => Uint8Array.from(zipBytes).buffer } as File;
    const rehydrated = await readZipSnapshot(file);

    expect(rehydrated.files.has("datasets/demo.md")).toBe(true);
    expect(rehydrated.files.has("types/note.md")).toBe(true);
    expect(rehydrated.files.has("records/note/record-1.md")).toBe(true);
    expect(rehydrated.files.has("assets/info.txt")).toBe(true);
    expect(rehydrated.files.has(".git/config")).toBe(false);

    for (const [path, contents] of snapshot.files.entries()) {
      if (path.startsWith(".git/")) {
        continue;
      }
      expect(rehydrated.files.get(path)).toEqual(contents);
    }
  });

  it("exports only dataset markdown files when requested", async () => {
    const snapshot = snapshotFromEntries([
      ["datasets/demo.md", "---\nid: dataset:demo\n---"],
      ["types/note.md", "---\nid: type:note\n---"],
      ["records/note/record-1.md", "---\nid: record:1\n---"],
      ["assets/info.txt", "extra"],
      ["records/note/record-2.txt", "ignore"]
    ]);

    const zipBytes = exportDatasetOnlyZip(snapshot);
    const file = { arrayBuffer: async () => Uint8Array.from(zipBytes).buffer } as File;
    const rehydrated = await readZipSnapshot(file);

    expect(rehydrated.files.size).toBe(3);
    expect(rehydrated.files.has("datasets/demo.md")).toBe(true);
    expect(rehydrated.files.has("types/note.md")).toBe(true);
    expect(rehydrated.files.has("records/note/record-1.md")).toBe(true);
    expect(rehydrated.files.has("assets/info.txt")).toBe(false);
    expect(rehydrated.files.has("records/note/record-2.txt")).toBe(false);
  });
});
