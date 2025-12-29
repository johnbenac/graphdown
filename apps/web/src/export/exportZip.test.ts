import { describe, expect, it } from "vitest";
import { strToU8 } from "fflate";
import type { RepoSnapshot } from "../../../../src/core/snapshotTypes";
import { readZipSnapshot } from "../import/readZipSnapshot";
import { exportDatasetOnlyZip, exportWholeSnapshotZip } from "./exportZip";

function createSnapshot(contents: Record<string, string>): RepoSnapshot {
  const files = new Map<string, Uint8Array>();
  for (const [path, body] of Object.entries(contents)) {
    files.set(path, new Uint8Array(strToU8(body)));
  }
  return { files };
}

describe("exportZip", () => {
  it("round-trips whole snapshot bytes excluding .git", async () => {
    const snapshot = createSnapshot({
      "datasets/demo.md": "---\nid: dataset:demo\n---",
      "types/note.md": "---\nid: type:note\n---",
      "records/note/record-1.md": "---\nid: record:1\n---",
      "assets/info.txt": "plain text",
      ".git/HEAD": "ref: refs/heads/main"
    });

    const zipBytes = exportWholeSnapshotZip(snapshot);
    const file = {
      arrayBuffer: async () => Uint8Array.from(zipBytes).buffer
    } as File;
    const roundTrip = await readZipSnapshot(file);

    const expectedFiles = new Map<string, Uint8Array>();
    for (const [path, contents] of snapshot.files.entries()) {
      if (path === ".git" || path.startsWith(".git/")) {
        continue;
      }
      expectedFiles.set(path, contents);
    }

    expect([...roundTrip.files.keys()].sort()).toEqual([...expectedFiles.keys()].sort());
    for (const [path, contents] of expectedFiles.entries()) {
      expect(roundTrip.files.get(path)).toEqual(contents);
    }
  });

  it("exports dataset-only markdown files", async () => {
    const snapshot = createSnapshot({
      "datasets/demo.md": "---\nid: dataset:demo\n---",
      "datasets/readme.MD": "# Dataset",
      "types/note.md": "---\nid: type:note\n---",
      "records/note/record-1.md": "---\nid: record:1\n---",
      "assets/info.txt": "plain text",
      "notes/todo.md": "# not included",
      ".git/config": "[core]"
    });

    const zipBytes = exportDatasetOnlyZip(snapshot);
    const file = {
      arrayBuffer: async () => Uint8Array.from(zipBytes).buffer
    } as File;
    const roundTrip = await readZipSnapshot(file);

    const expectedPaths = [
      "datasets/demo.md",
      "datasets/readme.MD",
      "types/note.md",
      "records/note/record-1.md"
    ];

    expect([...roundTrip.files.keys()].sort()).toEqual(expectedPaths.sort());
  });
});
