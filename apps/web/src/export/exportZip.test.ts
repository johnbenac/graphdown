import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { canonicalizeDatasetSnapshot } from "../core/canonicalizeDatasetSnapshot";
import { exportDatasetZipBytes } from "../core/export";
import type { DatasetSnapshot } from "../core/snapshotTypes";
import { loadRepoSnapshotFromZipBytes } from "../core/zipSnapshot";

const encoder = new TextEncoder();

function snapshotFromEntries(entries: Array<[string, string | Uint8Array]>): DatasetSnapshot {
  return {
    files: new Map(
      entries.map(([path, contents]) => [path, contents instanceof Uint8Array ? contents : encoder.encode(contents)])
    )
  };
}

describe("exportZip", () => {
  it("exports canonical snapshot paths only", () => {
    const rawSnapshot = snapshotFromEntries([
      ["weird/type-location.md", ["---", "typeId: note", "fields: {}", "---"].join("\n")],
      ["deeply/nested/record.md", ["---", "typeId: note", "recordId: one", "fields: {}", "---"].join("\n")]
    ]);

    const canonical = canonicalizeDatasetSnapshot(rawSnapshot);
    const exported = exportDatasetZipBytes(canonical);
    const imported = loadRepoSnapshotFromZipBytes(exported);
    expect([...imported.files.keys()].sort()).toEqual(["records/note.one/one.md", "types/note.md"]);
  });

  it("exports referenced blobs only", () => {
    const blobBytes = encoder.encode("flower");
    const digest = createHash("sha256").update(Buffer.from(blobBytes)).digest("hex");
    const blobPath = `blobs/sha256/${digest.slice(0, 2)}/${digest}`;

    const rawSnapshot = snapshotFromEntries([
      ["types/photo.md", ["---", "typeId: photo", "fields: {}", "---"].join("\n")],
      [
        "records/photo-1.md",
        ["---", "typeId: photo", "recordId: one", "fields: {}", "---", `See [[gdblob:sha256-${digest}]].`].join("\n")
      ],
      [blobPath, blobBytes],
      ["blobs/sha256/aa/" + "a".repeat(64), encoder.encode("garbage")]
    ]);

    const canonical = canonicalizeDatasetSnapshot(rawSnapshot);
    const exported = exportDatasetZipBytes(canonical);
    const imported = loadRepoSnapshotFromZipBytes(exported);
    const paths = [...imported.files.keys()];
    expect(paths).toContain(blobPath);
    expect(paths).not.toContain("blobs/sha256/aa/" + "a".repeat(64));
  });
});
