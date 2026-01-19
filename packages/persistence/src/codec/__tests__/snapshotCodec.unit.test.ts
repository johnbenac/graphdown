import { describe, expect, it } from "vitest";
import type { DatasetSnapshot } from "@graphdown/core";
import {
  deserializeDatasetSnapshotV1,
  serializeDatasetSnapshotV1
} from "../snapshotCodec";

const encoder = new TextEncoder();

describe("snapshot codec", () => {
  it("round-trips dataset snapshots with sorted paths", () => {
    const snapshot: DatasetSnapshot = {
      files: new Map([
        ["records/zeta.md", encoder.encode("z")],
        ["records/alpha.md", encoder.encode("a")],
        ["records/middle.md", encoder.encode("m")]
      ])
    };

    const serialized = serializeDatasetSnapshotV1(snapshot);
    expect(serialized.files.map(([path]) => path)).toEqual([
      "records/alpha.md",
      "records/middle.md",
      "records/zeta.md"
    ]);

    const deserialized = deserializeDatasetSnapshotV1(serialized);
    expect(deserialized.ok).toBe(true);
    if (!deserialized.ok) return;

    const roundTrip = deserialized.snapshot;
    expect(roundTrip.files.size).toBe(snapshot.files.size);
    for (const [path, bytes] of snapshot.files.entries()) {
      const stored = roundTrip.files.get(path);
      expect(stored).toBeInstanceOf(Uint8Array);
      expect(stored && Buffer.from(stored).toString("utf8")).toBe(
        Buffer.from(bytes).toString("utf8")
      );
    }
  });

  it("accepts array buffer payloads", () => {
    const bytes = encoder.encode("hello");
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

    const deserialized = deserializeDatasetSnapshotV1({
      files: [["records/note.md", buffer]]
    });

    expect(deserialized.ok).toBe(true);
    if (!deserialized.ok) return;

    const stored = deserialized.snapshot.files.get("records/note.md");
    expect(stored).toBeInstanceOf(Uint8Array);
    expect(stored && Buffer.from(stored).toString("utf8")).toBe("hello");
  });

  it("rejects invalid inputs without throwing", () => {
    const nullResult = deserializeDatasetSnapshotV1(null);
    expect(nullResult.ok).toBe(false);

    const badFilesResult = deserializeDatasetSnapshotV1({ files: "nope" });
    expect(badFilesResult.ok).toBe(false);

    const badEntryResult = deserializeDatasetSnapshotV1({ files: [["path", "bytes"]] });
    expect(badEntryResult.ok).toBe(false);
  });
});
