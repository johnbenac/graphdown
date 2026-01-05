import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { strToU8, unzipSync } from "fflate";
import { canonicalizeDatasetSnapshot } from "../core/canonicalizeDatasetSnapshot";
import { exportDatasetZipBytes } from "../core/export";
import type { DatasetSnapshot } from "../core/snapshotTypes";

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

function zipPaths(bytes: Uint8Array): string[] {
  return Object.keys(unzipSync(bytes)).filter((path) => !path.endsWith("/"));
}

describe("exportDatasetZipBytes", () => {
  it("exports only canonical dataset paths", () => {
    const snapshot = snapshotFromEntries([
      ["weird/type-location.md", ["---", "typeId: note", "fields: {}", "---"].join("\n")],
      [
        "deeply/nested/record.md",
        ["---", "typeId: note", "recordId: one", "fields: {}", "---"].join("\n")
      ]
    ]);

    const canonical = canonicalizeDatasetSnapshot(snapshot);
    const exported = exportDatasetZipBytes(canonical);
    const paths = zipPaths(exported);

    expect(paths.sort()).toEqual(["types/note.md", "records/note.one/one.md"].sort());
  });

  it("includes only referenced blobs", () => {
    const blobBytes = new Uint8Array(strToU8("flower"));
    const digest = createHash("sha256").update(Buffer.from(blobBytes)).digest("hex");
    const blobPath = `blobs/sha256/${digest.slice(0, 2)}/${digest}`;

    const snapshot = snapshotFromEntries([
      ["types/photo.md", ["---", "typeId: photo", "fields: {}", "---"].join("\n")],
      [
        "records/photo-1.md",
        ["---", "typeId: photo", "recordId: one", "fields: {}", "---", `See [[gdblob:sha256-${digest}]].`].join(
          "\n"
        )
      ],
      [blobPath, blobBytes],
      ["blobs/sha256/aa/" + "a".repeat(64), new Uint8Array(strToU8("garbage"))]
    ]);

    const canonical = canonicalizeDatasetSnapshot(snapshot);
    const exported = exportDatasetZipBytes(canonical);
    const paths = zipPaths(exported);

    expect(paths).toContain(blobPath);
    expect(paths).not.toContain("blobs/sha256/aa/" + "a".repeat(64));
  });
});
