import { describe, expect, it } from "vitest";
import { validateDatasetSnapshot } from "@graphdown/dataset";
import { buildDatasetZipBytes, loadDatasetSnapshotFromZipBytes } from "@graphdown/io-zip";
import { snapshotFromTextFiles } from "../../harness";

describe("integration smoke: io-zip <-> core", () => {
  it("round-trips a valid dataset snapshot through zip bytes", () => {
    const snapshot = snapshotFromTextFiles([
      [
        "types/note.md",
        ["---", "typeId: note", "fields: {}", "---", "# Note Type", ""].join("\n")
      ],
      [
        "records/note/one.md",
        ["---", "typeId: note", "recordId: one", "fields: {}", "---", "# One", ""].join("\n")
      ]
    ]);

    const before = validateDatasetSnapshot(snapshot);
    expect(before.ok).toBe(true);

    const zipBytes = buildDatasetZipBytes(snapshot);
    const roundTripped = loadDatasetSnapshotFromZipBytes(zipBytes);

    const after = validateDatasetSnapshot(roundTripped);
    expect(after.ok).toBe(true);

    // Byte-for-byte preservation check
    expect(roundTripped.files.size).toBe(snapshot.files.size);
    for (const [path, bytes] of snapshot.files.entries()) {
      expect(roundTripped.files.get(path)).toEqual(bytes);
    }
  });
});
