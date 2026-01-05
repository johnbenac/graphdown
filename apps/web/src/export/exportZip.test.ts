import { createHash } from "node:crypto";
import { strToU8 } from "fflate";
import { describe, expect, it } from "vitest";
import { canonicalizeDatasetSnapshot } from "../core/canonicalizeDatasetSnapshot";
import { exportDatasetZipBytes } from "../core/export";
import type { DatasetSnapshot } from "../core/snapshotTypes";
import { readZipSnapshot } from "../import/readZipSnapshot";

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

async function readSnapshotFromZipBytes(bytes: Uint8Array): Promise<DatasetSnapshot> {
  const buffer = Uint8Array.from(bytes).buffer;
  const file = {
    arrayBuffer: async () => buffer
  } as File;
  const { snapshot } = await readZipSnapshot(file);
  return snapshot;
}

describe("exportDatasetZipBytes", () => {
  it("exports canonical snapshot paths", async () => {
    const rawSnapshot = snapshotFromEntries([
      ["types/type.md", ["---", "typeId: note", "fields: {}", "---"].join("\n")],
      ["records/record.md", ["---", "typeId: note", "recordId: one", "fields: {}", "---"].join("\n")]
    ]);

    const canonical = canonicalizeDatasetSnapshot(rawSnapshot);
    const exported = exportDatasetZipBytes(canonical);
    const imported = await readSnapshotFromZipBytes(exported);

    expect([...imported.files.keys()].sort()).toEqual([
      "records/note.one/one.md",
      "types/note.md"
    ]);
  });

  it("exports only referenced blobs", async () => {
    const blobBytes = new Uint8Array(strToU8("flower"));
    const digest = createHash("sha256").update(Buffer.from(blobBytes)).digest("hex");
    const blobPath = `blobs/sha256/${digest.slice(0, 2)}/${digest}`;

    const rawSnapshot = snapshotFromEntries([
      ["types/photo.md", ["---", "typeId: photo", "fields: {}", "---"].join("\n")],
      [
        "records/photo.md",
        ["---", "typeId: photo", "recordId: one", "fields: {}", "---", `See [[gdblob:sha256-${digest}]].`].join(
          "\n"
        )
      ],
      [blobPath, blobBytes],
      ["blobs/sha256/aa/" + "a".repeat(64), new Uint8Array(strToU8("garbage"))]
    ]);

    const canonical = canonicalizeDatasetSnapshot(rawSnapshot);
    const exported = exportDatasetZipBytes(canonical);
    const imported = await readSnapshotFromZipBytes(exported);

    expect([...imported.files.keys()].sort()).toEqual([
      blobPath,
      "records/photo.one/one.md",
      "types/photo.md"
    ]);
  });
});
