import { describe, expect, it } from "vitest";
import type { DatasetSnapshot } from "@graphdown/core";
import {
  deserializeDatasetSnapshotV1,
  serializeDatasetSnapshotV1
} from "../snapshotCodec";

const encoder = new TextEncoder();

describe("snapshot codec", () => {
  it("round-trips snapshots with deterministic ordering", () => {
    const snapshot: DatasetSnapshot = {
      files: new Map([
        ["records/zeta.md", encoder.encode("zeta")],
        ["records/alpha.md", encoder.encode("alpha")]
      ])
    };

    const serialized = serializeDatasetSnapshotV1(snapshot);
    expect(serialized.files.map(([path]) => path)).toEqual(["records/alpha.md", "records/zeta.md"]);

    const decoded = deserializeDatasetSnapshotV1(serialized);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.snapshot.files.get("records/alpha.md")).toEqual(encoder.encode("alpha"));
    expect(decoded.snapshot.files.get("records/zeta.md")).toEqual(encoder.encode("zeta"));
  });

  it("rejects invalid inputs without throwing", () => {
    expect(deserializeDatasetSnapshotV1(null).ok).toBe(false);
    expect(deserializeDatasetSnapshotV1({ files: "nope" }).ok).toBe(false);
    expect(deserializeDatasetSnapshotV1({ files: ["bad"] }).ok).toBe(false);
    expect(
      deserializeDatasetSnapshotV1({ files: [["path", "not-bytes"]] }).ok
    ).toBe(false);
  });
});
