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
  it("EXP-003: whole-repo export round-trips snapshot files", async () => {
    const snapshot = snapshotFromEntries([
      ["types/note.md", "---\nid: type:note\n---"],
      ["records/note/record-1.md", "---\nid: record:1\n---"],
      ["assets/info.txt", "hello"],
      [".git/config", "ignored"]
    ]);

    const exported = exportWholeSnapshotZip(snapshot);
    const imported = await readSnapshotFromZipBytes(exported);

    expect(imported.files.size).toBe(3);
    for (const [path, contents] of snapshot.files) {
      if (path.startsWith(".git/")) {
        expect(imported.files.has(path)).toBe(false);
        continue;
      }
      expect(imported.files.has(path)).toBe(true);
      expect(imported.files.get(path)).toEqual(contents);
    }
  });

  it("EXP-002: record-only export includes only type/record markdown", async () => {
    const snapshot = snapshotFromEntries([
      ["types/note.md", "---\nid: type:note\n---"],
      ["records/note/record-1.md", "---\nid: record:1\n---"],
      ["types/README.txt", "skip"],
      ["assets/info.md", "skip"]
    ]);

    const exported = exportDatasetOnlyZip(snapshot);
    const imported = await readSnapshotFromZipBytes(exported);

    expect([...imported.files.keys()].sort()).toEqual(["records/note/record-1.md", "types/note.md"]);
  });

  it("EXP-004: export preserves original record paths", async () => {
    const snapshot = snapshotFromEntries([
      ["types/note.md", "---\nid: type:note\n---"],
      ["records/note/2025/record-1.md", "---\nid: record:1\n---"]
    ]);

    const exported = exportDatasetOnlyZip(snapshot);
    const imported = await readSnapshotFromZipBytes(exported);

    expect(imported.files.has("records/note/2025/record-1.md")).toBe(true);
    expect(imported.files.get("records/note/2025/record-1.md")).toEqual(
      snapshot.files.get("records/note/2025/record-1.md")
    );
  });
});
