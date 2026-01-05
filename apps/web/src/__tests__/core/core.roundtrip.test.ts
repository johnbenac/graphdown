import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { strToU8 } from "fflate";
import { buildGraphFromSnapshot } from "../../core/graph";
import { canonicalizeDatasetSnapshot } from "../../core/canonicalizeDatasetSnapshot";
import { exportDatasetZipBytes } from "../../core/export";
import { loadDatasetSnapshotFromZipBytes } from "../../core/zipSnapshot";

function makeSnapshot(entries: Array<[string, string | Uint8Array]>) {
  return {
    files: new Map(
      entries.map(([path, content]) => [
        path,
        content instanceof Uint8Array ? content : new Uint8Array(strToU8(content))
      ])
    )
  };
}

function hash(content: Uint8Array) {
  return createHash("sha256").update(content).digest("hex");
}

describe("core roundtrip", () => {
  it("EXP-006: dataset export includes reachable blobs", () => {
    const blobBytes = new Uint8Array(strToU8("flower"));
    const digest = hash(blobBytes);
    const blobPath = `blobs/sha256/${digest.slice(0, 2)}/${digest}`;

    const snapshot = makeSnapshot([
      ["types/note.md", ["---", "typeId: note", "fields: {}", "---", ""].join("\n")],
      [
        "records/note-1.md",
        [
          "---",
          "typeId: note",
          "recordId: one",
          "fields: {}",
          "---",
          `See [[gdblob:sha256-${digest}]].`
        ].join("\n")
      ],
      [blobPath, blobBytes]
    ]);

    const canonical = canonicalizeDatasetSnapshot(snapshot);
    const zipBytes = exportDatasetZipBytes(canonical);
    const roundTripped = loadDatasetSnapshotFromZipBytes(zipBytes);
    const paths = [...roundTripped.files.keys()];

    expect(paths).toContain(blobPath);
    expect(paths).toContain("types/note.md");
    expect(paths).toContain("records/note.one/one.md");
  });

  it("GC-002: dataset export excludes unreferenced blobs", () => {
    const blobBytes = new Uint8Array(strToU8("flower"));
    const digest = hash(blobBytes);
    const blobPath = `blobs/sha256/${digest.slice(0, 2)}/${digest}`;

    const snapshot = makeSnapshot([
      ["types/note.md", ["---", "typeId: note", "fields: {}", "---", ""].join("\n")],
      [
        "records/note-1.md",
        [
          "---",
          "typeId: note",
          "recordId: one",
          "fields: {}",
          "---",
          `See [[gdblob:sha256-${digest}]].`
        ].join("\n")
      ],
      [blobPath, blobBytes],
      ["blobs/sha256/aa/aa" + "0".repeat(62), new Uint8Array(strToU8("garbage blob"))]
    ]);

    const canonical = canonicalizeDatasetSnapshot(snapshot);
    const zipBytes = exportDatasetZipBytes(canonical);
    const roundTripped = loadDatasetSnapshotFromZipBytes(zipBytes);
    const paths = [...roundTripped.files.keys()];

    expect(paths).not.toContain("blobs/sha256/aa/aa" + "0".repeat(62));
  });

  it("EXP-005: dataset export preserves bytes exactly", () => {
    const original = new Uint8Array(
      strToU8(
      [
        "---",
        "typeId: note",
        "recordId: one",
        "fields: {}",
        "---",
        "Body with \r\ntrailing  ",
        "Emoji: 😊"
      ].join("\n")
      )
    );
    const snapshot = makeSnapshot([
      ["types/note.md", ["---", "typeId: note", "fields: {}", "---"].join("\n")],
      ["records/note/custom.md", original]
    ]);

    const canonical = canonicalizeDatasetSnapshot(snapshot);
    const exported = exportDatasetZipBytes(canonical);
    const imported = loadDatasetSnapshotFromZipBytes(exported);
    const roundTrip = imported.files.get("records/note.one/one.md");

    expect(roundTrip).toBeDefined();
    expect(roundTrip).toEqual(original);
  });

  it("graph round-trips through zip exports", () => {
    const snapshot = makeSnapshot([
      ["types/note.md", ["---", "typeId: note", "fields: {}", "---", ""].join("\n")],
      ["records/note.md", ["---", "typeId: note", "recordId: one", "fields: {}", "---", "Body"].join("\n")]
    ]);

    const canonical = canonicalizeDatasetSnapshot(snapshot);
    const exported = exportDatasetZipBytes(canonical);
    const roundTripped = loadDatasetSnapshotFromZipBytes(exported);
    const graph = buildGraphFromSnapshot(roundTripped);
    expect(graph.ok).toBe(true);
    if (!graph.ok) {
      throw new Error(JSON.stringify(graph.errors));
    }
    expect(graph.graph.getRecord("note:one")).not.toBeNull();
  });
});
