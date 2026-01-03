import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { strToU8 } from "fflate";
import type { RepoSnapshot } from "../../../../src/core/snapshotTypes";
import { readZipSnapshot } from "../import/readZipSnapshot";
import { exportDatasetOnlyZip, exportWholeSnapshotZip } from "./exportZip";

function snapshotFromEntries(entries: Array<[string, string | Uint8Array]>): RepoSnapshot {
  return {
    files: new Map(
      entries.map(([path, contents]) => [
        path,
        contents instanceof Uint8Array ? contents : new Uint8Array(strToU8(contents))
      ])
    )
  };
}

async function readSnapshotFromZipBytes(bytes: Uint8Array): Promise<RepoSnapshot> {
  const buffer = Uint8Array.from(bytes).buffer;
  const file = {
    arrayBuffer: async () => buffer
  } as File;
  return readZipSnapshot(file);
}

describe("exportZip", () => {
  it("EXP-003: whole-repo export round-trips snapshot files", async () => {
    const snapshot = snapshotFromEntries([
      ["types/note.md", ["---", "typeId: note", "fields: {}", "---"].join("\n")],
      ["records/note-1.md", ["---", "typeId: note", "recordId: one", "fields: {}", "---"].join("\n")],
      ["assets/info.txt", "hello"],
      [".git/config", "ignored"]
    ]);

    const exported = exportWholeSnapshotZip(snapshot);
    const imported = await readSnapshotFromZipBytes(exported);

    expect(imported.files.size).toBe(3);
    for (const [path, contents] of snapshot.files) {
      if (path.startsWith(".git/")) {
        expect(imported.files.has(path)).toBe(false);
        continue;
      }
      expect(imported.files.has(path)).toBe(true);
      expect(imported.files.get(path)).toEqual(contents);
    }
  });

  it("EXP-006: record-only export includes reachable blobs", async () => {
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
      ["blobs/sha256/aa/" + "a".repeat(64), new Uint8Array(strToU8("garbage"))],
      ["docs/readme.md", "ignore"]
    ]);

    const exported = exportDatasetOnlyZip(snapshot);
    const imported = await readSnapshotFromZipBytes(exported);
    const paths = [...imported.files.keys()].sort();
    expect(paths).toEqual(["records/photo-1.md", "types/photo.md", blobPath].sort());
  });

  it("GC-002: record-only export excludes unreferenced blobs", async () => {
    const blobBytes = new Uint8Array(strToU8("flower"));
    const digest = createHash("sha256").update(Buffer.from(blobBytes)).digest("hex");

    const snapshot = snapshotFromEntries([
      ["types/photo.md", ["---", "typeId: photo", "fields: {}", "---"].join("\n")],
      [
        "records/photo-1.md",
        ["---", "typeId: photo", "recordId: one", "fields: {}", "---", `See [[gdblob:sha256-${digest}]].`].join("\n")
      ],
      [`blobs/sha256/${digest.slice(0, 2)}/${digest}`, blobBytes],
      ["blobs/sha256/aa/" + "a".repeat(64), new Uint8Array(strToU8("garbage"))]
    ]);

    const exported = exportDatasetOnlyZip(snapshot);
    const imported = await readSnapshotFromZipBytes(exported);
    const paths = [...imported.files.keys()];
    expect(paths).not.toContain("blobs/sha256/aa/" + "a".repeat(64));
  });

  it("EXP-002: record-only export excludes non-graph files", async () => {
    const snapshot = snapshotFromEntries([
      ["types/note.md", ["---", "typeId: note", "fields: {}", "---"].join("\n")],
      ["records/note/one.md", ["---", "typeId: note", "recordId: one", "fields: {}", "---"].join("\n")],
      ["docs/readme.md", "ignore me"],
      ["assets/logo.png", "binary"],
      [".git/config", "ignored"]
    ]);

    const exported = exportDatasetOnlyZip(snapshot);
    const imported = await readSnapshotFromZipBytes(exported);
    expect([...imported.files.keys()].sort()).toEqual(["records/note/one.md", "types/note.md"]);
  });

  it("EXP-004: record-only export preserves original record paths", async () => {
    const snapshot = snapshotFromEntries([
      ["types/note.md", ["---", "typeId: note", "fields: {}", "---"].join("\n")],
      ["records/note/weird file name.md", ["---", "typeId: note", "recordId: one", "fields: {}", "---"].join("\n")]
    ]);

    const exported = exportDatasetOnlyZip(snapshot);
    const imported = await readSnapshotFromZipBytes(exported);
    expect(imported.files.has("records/note/weird file name.md")).toBe(true);
  });

  it("EXP-005: record-only export preserves bytes exactly", async () => {
    const original = new Uint8Array(
      strToU8(["---", "typeId: note", "recordId: one", "fields: {}", "---", "Body with \r\ntrailing  ", "Emoji: 😊"].join("\n"))
    );
    const snapshot = snapshotFromEntries([
      ["types/note.md", ["---", "typeId: note", "fields: {}", "---"].join("\n")],
      ["records/note/custom.md", original]
    ]);

    const exported = exportDatasetOnlyZip(snapshot);
    const imported = await readSnapshotFromZipBytes(exported);
    const roundTrip = imported.files.get("records/note/custom.md");
    expect(roundTrip).toBeDefined();
    expect(roundTrip).toEqual(original);
  });
});
