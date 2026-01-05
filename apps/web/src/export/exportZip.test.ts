import { createHash } from "node:crypto";
import { strToU8 } from "fflate";
import { describe, expect, it } from "vitest";
import { canonicalizeDatasetSnapshot } from "../core/canonicalizeDatasetSnapshot";
import type { DatasetSnapshot } from "../core/snapshotTypes";
import { exportDatasetZipBytes } from "../core/export";
import { loadDatasetSnapshotFromZipBytes } from "../core/zipSnapshot";

function snapshotFromEntries(entries: Array<[string, string | Uint8Array]>): DatasetSnapshot {
  return {
    files: new Map(
      entries.map(([path, contents]) => [
        path,
        contents instanceof Uint8Array ? contents : new Uint8Array(strToU8(contents))
      ])
    )
  };
}

function exportAndLoad(rawSnapshot: DatasetSnapshot) {
  const canonical = canonicalizeDatasetSnapshot(rawSnapshot);
  const zipBytes = exportDatasetZipBytes(canonical);
  return loadDatasetSnapshotFromZipBytes(zipBytes);
}

describe("exportDatasetZipBytes", () => {
  it("EXP-HIER-001: export uses canonical layout paths", () => {
    const snapshot = snapshotFromEntries([
      ["weird/type-location.md", ["---", "typeId: note", "fields: {}", "---"].join("\n")],
      ["deep/nested/record.md", ["---", "typeId: note", "recordId: one", "fields: {}", "---"].join("\n")],
      ["docs/readme.md", "# ignore"],
      ["assets/logo.png", "binary"]
    ]);

    const imported = exportAndLoad(snapshot);
    const paths = [...imported.files.keys()].sort();
    expect(paths).toEqual(["records/note.one/one.md", "types/note.md"]);
  });

  it("EXP-006: includes only referenced blobs alongside canonical records/types", () => {
    const blobBytes = new Uint8Array(strToU8("flower"));
    const digest = createHash("sha256").update(Buffer.from(blobBytes)).digest("hex");
    const blobPath = `blobs/sha256/${digest.slice(0, 2)}/${digest}`;

    const snapshot = snapshotFromEntries([
      ["types/photo.md", ["---", "typeId: photo", "fields: {}", "---"].join("\n")],
      [
        "records/photo-1.md",
        ["---", "typeId: photo", "recordId: one", "fields: {}", "---", `See [[gdblob:sha256-${digest}]].`].join("\n")
      ],
      [blobPath, blobBytes],
      ["blobs/sha256/aa/" + "a".repeat(64), new Uint8Array(strToU8("garbage"))]
    ]);

    const imported = exportAndLoad(snapshot);
    const paths = [...imported.files.keys()].sort();
    expect(paths).toEqual(["records/photo.one/one.md", "types/photo.md", blobPath].sort());
  });
});
