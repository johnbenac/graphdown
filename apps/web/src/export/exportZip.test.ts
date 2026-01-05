import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { strToU8 } from "fflate";
import type { DatasetSnapshot } from "../core/snapshotTypes";
import { canonicalizeDatasetSnapshot } from "../core/canonicalizeDatasetSnapshot";
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

describe("exportDatasetZipBytes", () => {
  it("exports canonical snapshot paths only", () => {
    const snapshot = snapshotFromEntries([
      ["types/note.md", ["---", "typeId: note", "fields: {}", "---"].join("\n")],
      ["records/note.md", ["---", "typeId: note", "recordId: one", "fields: {}", "---"].join("\n")],
      ["docs/readme.md", "ignored"]
    ]);

    const canonical = canonicalizeDatasetSnapshot(snapshot);
    const exported = exportDatasetZipBytes(canonical);
    const imported = loadDatasetSnapshotFromZipBytes(exported);

    expect([...imported.files.keys()].sort()).toEqual(["records/note.one/one.md", "types/note.md"].sort());
  });

  it("includes referenced blobs only", () => {
    const blobBytes = new Uint8Array(strToU8("flower"));
    const digest = createHash("sha256").update(Buffer.from(blobBytes)).digest("hex");
    const blobPath = `blobs/sha256/${digest.slice(0, 2)}/${digest}`;

    const snapshot = snapshotFromEntries([
      ["types/photo.md", ["---", "typeId: photo", "fields: {}", "---"].join("\n")],
      [
        "records/photo.md",
        ["---", "typeId: photo", "recordId: one", "fields: {}", "---", `See [[gdblob:sha256-${digest}]].`].join("\n")
      ],
      [blobPath, blobBytes],
      ["blobs/sha256/aa/" + "a".repeat(64), new Uint8Array(strToU8("garbage"))]
    ]);

    const canonical = canonicalizeDatasetSnapshot(snapshot);
    const exported = exportDatasetZipBytes(canonical);
    const imported = loadDatasetSnapshotFromZipBytes(exported);
    const paths = [...imported.files.keys()];

    expect(paths).toContain(blobPath);
    expect(paths).not.toContain("blobs/sha256/aa/" + "a".repeat(64));
  });

  it("GC-001: reachable blob set includes references from fields", () => {
    const blobBytes = new Uint8Array(strToU8("orchid"));
    const digest = createHash("sha256").update(Buffer.from(blobBytes)).digest("hex");
    const blobPath = `blobs/sha256/${digest.slice(0, 2)}/${digest}`;

    const snapshot = snapshotFromEntries([
      ["types/photo.md", ["---", "typeId: photo", "fields: {}", "---"].join("\n")],
      [
        "records/photo.md",
        [
          "---",
          "typeId: photo",
          "recordId: one",
          "fields:",
          `  note: \"[[gdblob:sha256-${digest}]]\"`,
          "---",
          "Body"
        ].join("\n")
      ],
      [blobPath, blobBytes]
    ]);

    const canonical = canonicalizeDatasetSnapshot(snapshot);
    const exported = exportDatasetZipBytes(canonical);
    const imported = loadDatasetSnapshotFromZipBytes(exported);
    const paths = [...imported.files.keys()];

    expect(paths).toContain(blobPath);
  });

  it("EXP-HIER-001: canonical parent-based export layout nests records under their parent directory", () => {
    const snapshot = snapshotFromEntries([
      ["types/car.md", ["---", "typeId: car", "fields: {}", "---"].join("\n")],
      ["types/part.md", ["---", "typeId: part", "fields: {}", "---"].join("\n")],
      ["types/spec.md", ["---", "typeId: spec", "fields: {}", "---"].join("\n")],
      ["records/car.md", ["---", "typeId: car", "recordId: car-1", "fields: {}", "---"].join("\n")],
      [
        "records/part.md",
        [
          "---",
          "typeId: part",
          "recordId: steeringwheel",
          "parent: car:car-1",
          "fields: {}",
          "---"
        ].join("\n")
      ],
      [
        "records/spec.md",
        [
          "---",
          "typeId: spec",
          "recordId: steeringwheel-spec",
          "parent: part:steeringwheel",
          "fields: {}",
          "---"
        ].join("\n")
      ]
    ]);

    const canonical = canonicalizeDatasetSnapshot(snapshot);
    const exported = exportDatasetZipBytes(canonical);
    const imported = loadDatasetSnapshotFromZipBytes(exported);
    const paths = [...imported.files.keys()].sort();

    expect(paths).toEqual(
      [
        "types/car.md",
        "types/part.md",
        "types/spec.md",
        "records/car.car-1/car-1.md",
        "records/car.car-1/part.steeringwheel/steeringwheel.md",
        "records/car.car-1/part.steeringwheel/spec.steeringwheel-spec/steeringwheel-spec.md"
      ].sort()
    );
  });
});
