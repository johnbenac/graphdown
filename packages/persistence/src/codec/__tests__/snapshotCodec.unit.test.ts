import { describe, expect, it } from "vitest";
import type { DatasetSnapshot } from "@graphmd/dataset";
import {
  deserializeDatasetSnapshotV1,
  serializeDatasetSnapshotV1
} from "../snapshotCodec";

describe("snapshot codec", () => {
  it("round-trips snapshot data with deterministic ordering", () => {
    const snapshot: DatasetSnapshot = {
      files: new Map([
        ["records/beta.md", Uint8Array.from([2])],
        ["records/alpha.md", Uint8Array.from([1])]
      ])
    };

    const serialized = serializeDatasetSnapshotV1(snapshot);
    expect(serialized.files.map(([path]) => path)).toEqual([
      "records/alpha.md",
      "records/beta.md"
    ]);

    const result = deserializeDatasetSnapshotV1(serialized);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.snapshot.files.size).toBe(2);
    expect(result.snapshot.files.get("records/alpha.md")).toEqual(Uint8Array.from([1]));
    expect(result.snapshot.files.get("records/beta.md")).toEqual(Uint8Array.from([2]));
  });

  it("returns errors for invalid payloads", () => {
    expect(deserializeDatasetSnapshotV1(null)).toEqual({
      ok: false,
      error: "Snapshot payload must be an object."
    });
    expect(deserializeDatasetSnapshotV1({ files: "nope" })).toEqual({
      ok: false,
      error: "Snapshot files must be an array."
    });
    expect(deserializeDatasetSnapshotV1({ files: [["file.md", "bad"]] })).toEqual({
      ok: false,
      error: "Snapshot file entries must contain a string and Uint8Array."
    });
  });
});
