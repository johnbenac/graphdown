import { describe, expect, it } from "vitest";
import { strToU8 } from "fflate";
import type { RepoSnapshot } from "../../../../src/core/snapshotTypes";
import { readZipSnapshot } from "../import/readZipSnapshot";
import { exportDatasetOnlyZip, exportWholeSnapshotZip } from "./exportZip";

function createSnapshot(): RepoSnapshot {
  return {
    files: new Map([
      ["datasets/demo.md", new Uint8Array(strToU8("---\nid: dataset:demo\n---"))],
      ["types/note.md", new Uint8Array(strToU8("---\nid: type:note\n---"))],
      [
        "records/note/record-1.md",
        new Uint8Array(strToU8("---\nid: record:1\n---"))
      ],
      ["assets/info.txt", new Uint8Array(strToU8("extra"))]
    ])
  };
}

describe("exportZip", () => {
  it("exports a whole snapshot zip that round-trips via readZipSnapshot", async () => {
    const snapshot = createSnapshot();
    const zipBytes = exportWholeSnapshotZip(snapshot);
    const buffer = Uint8Array.from(zipBytes).buffer;
    const file = {
      arrayBuffer: async () => buffer
    } as File;

    const roundTripped = await readZipSnapshot(file);

    expect(roundTripped.files.size).toBe(snapshot.files.size);
    for (const [path, contents] of snapshot.files.entries()) {
      const roundTripContents = roundTripped.files.get(path);
      expect(roundTripContents).toBeDefined();
      expect(Array.from(roundTripContents ?? [])).toEqual(Array.from(contents));
    }
  });

  it("exports dataset-only zip with markdown dataset paths", async () => {
    const snapshot = createSnapshot();
    const zipBytes = exportDatasetOnlyZip(snapshot);
    const buffer = Uint8Array.from(zipBytes).buffer;
    const file = {
      arrayBuffer: async () => buffer
    } as File;

    const roundTripped = await readZipSnapshot(file);

    expect(roundTripped.files.has("datasets/demo.md")).toBe(true);
    expect(roundTripped.files.has("types/note.md")).toBe(true);
    expect(roundTripped.files.has("records/note/record-1.md")).toBe(true);
    expect(roundTripped.files.has("assets/info.txt")).toBe(false);
  });
});
