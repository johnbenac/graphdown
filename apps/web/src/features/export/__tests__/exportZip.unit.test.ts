import { strToU8 } from "fflate";
import { describe, expect, it } from "vitest";
import { blockPathForCid, canonicalizeDatasetSnapshot, cidFromRawBytes } from "@graphdown/core";
import type { DatasetSnapshot } from "@graphdown/core";
import { buildDatasetZipBytes, loadDatasetSnapshotFromZipBytes } from "@graphdown/io-zip";

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
  const zipBytes = buildDatasetZipBytes(canonical);
  return loadDatasetSnapshotFromZipBytes(zipBytes);
}

describe("buildDatasetZipBytes", () => {
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

  it("GC-001: reachable block set includes references from fields", () => {
    const blobBytes = new Uint8Array(strToU8("orchid"));
    const cid = cidFromRawBytes(blobBytes);
    const blockPath = blockPathForCid(cid);

    const snapshot = snapshotFromEntries([
      ["types/photo.md", ["---", "typeId: photo", "fields: {}", "---"].join("\n")],
      [
        "records/photo-1.md",
        ["---", "typeId: photo", "recordId: one", "fields:", `  ref: "[[${cid}]]"`, "---", "Body"].join("\n")
      ],
      [blockPath, blobBytes]
    ]);

    const imported = exportAndLoad(snapshot);
    expect(imported.files.has(blockPath)).toBe(true);
  });

  it("EXP-003: canonical dataset export excludes non-graph files", () => {
    const snapshot = snapshotFromEntries([
      ["types/note.md", ["---", "typeId: note", "fields: {}", "---"].join("\n")],
      ["records/note/custom.md", ["---", "typeId: note", "recordId: one", "fields: {}", "---"].join("\n")],
      ["docs/readme.md", "ignore me"],
      ["assets/logo.png", "binary"]
    ]);

    const imported = exportAndLoad(snapshot);
    expect([...imported.files.keys()].sort()).toEqual(["records/note.one/one.md", "types/note.md"]);
  });

  it("EXP-003: canonical dataset export ignores imported record/type file paths", () => {
    const snapshot = snapshotFromEntries([
      ["custom/path/type.md", ["---", "typeId: note", "fields: {}", "---"].join("\n")],
      ["another/deep/record.md", ["---", "typeId: note", "recordId: one", "fields: {}", "---"].join("\n")]
    ]);

    const imported = exportAndLoad(snapshot);
    expect(imported.files.has("types/note.md")).toBe(true);
    expect(imported.files.has("records/note.one/one.md")).toBe(true);
    expect(imported.files.has("custom/path/type.md")).toBe(false);
    expect(imported.files.has("another/deep/record.md")).toBe(false);
  });

  it("EXP-005: export preserves bytes exactly", () => {
    const original = new Uint8Array(
      strToU8(["---", "typeId: note", "recordId: one", "fields: {}", "---", "Body with \r\ntrailing  ", "Emoji: 😊"].join("\n"))
    );
    const snapshot = snapshotFromEntries([
      ["types/note.md", ["---", "typeId: note", "fields: {}", "---"].join("\n")],
      ["records/note/custom.md", original]
    ]);

    const imported = exportAndLoad(snapshot);
    const roundTrip = imported.files.get("records/note.one/one.md");
    expect(roundTrip).toBeDefined();
    expect(roundTrip).toEqual(original);
  });

  it("EXP-006: includes only referenced blocks alongside canonical records/types", () => {
    const blobBytes = new Uint8Array(strToU8("flower"));
    const cid = cidFromRawBytes(blobBytes);
    const blockPath = blockPathForCid(cid);
    const garbageBytes = new Uint8Array(strToU8("garbage"));
    const garbageCid = cidFromRawBytes(garbageBytes);
    const garbagePath = blockPathForCid(garbageCid);

    const snapshot = snapshotFromEntries([
      ["types/photo.md", ["---", "typeId: photo", "fields: {}", "---"].join("\n")],
      [
        "records/photo-1.md",
        ["---", "typeId: photo", "recordId: one", "fields: {}", "---", `See [[${cid}]].`].join("\n")
      ],
      [blockPath, blobBytes],
      [garbagePath, garbageBytes]
    ]);

    const imported = exportAndLoad(snapshot);
    const paths = [...imported.files.keys()].sort();
    expect(paths).toEqual(["records/photo.one/one.md", "types/photo.md", blockPath].sort());
  });
});
