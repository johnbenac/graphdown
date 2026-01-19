import { describe, expect, it } from "vitest";
import type { DatasetSnapshot } from "@graphdown/core";
import { deserializeDatasetSnapshotV1, serializeDatasetSnapshotV1 } from "../snapshotCodec";

const encoder = new TextEncoder();

describe("snapshot codec", () => {
  it("round-trips snapshots with deterministic ordering", () => {
    const snapshot: DatasetSnapshot = {
      files: new Map([
        ["records/note/b.md", encoder.encode("b")],
        ["types/note.md", encoder.encode("type")],
        ["records/note/a.md", encoder.encode("a")]
      ])
    };

    const serialized = serializeDatasetSnapshotV1(snapshot);
    const paths = serialized.files.map(([path]) => path);
    expect(paths).toEqual(["records/note/a.md", "records/note/b.md", "types/note.md"]);

    const result = deserializeDatasetSnapshotV1(serialized);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.files.size).toBe(3);
      expect(result.snapshot.files.get("records/note/a.md")).toEqual(encoder.encode("a"));
      expect(result.snapshot.files.get("records/note/b.md")).toEqual(encoder.encode("b"));
      expect(result.snapshot.files.get("types/note.md")).toEqual(encoder.encode("type"));
    }
  });

  it("rejects invalid inputs without throwing", () => {
    expect(deserializeDatasetSnapshotV1(null).ok).toBe(false);
    expect(deserializeDatasetSnapshotV1({ files: "nope" }).ok).toBe(false);
    expect(deserializeDatasetSnapshotV1({ files: [["types/note.md", "bad"]] }).ok).toBe(false);
  });
});
