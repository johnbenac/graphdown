import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { canonicalizeDatasetSnapshot } from "../../core/canonicalizeDatasetSnapshot";
import { exportDatasetZipBytes } from "../../core/export";
import { loadRepoSnapshotFromZipBytes } from "../../core/zipSnapshot";

const encoder = new TextEncoder();

function makeSnapshot(entries: Array<[string, string | Uint8Array]>) {
  return { files: new Map(entries.map(([p, c]) => [p, typeof c === "string" ? encoder.encode(c) : c])) };
}

function hash(content: Uint8Array) {
  return createHash("sha256").update(content).digest("hex");
}

describe("core export roundtrip", () => {
  it("EXP-006: record-only export includes reachable blobs", () => {
    const blobBytes = encoder.encode("flower");
    const digest = hash(blobBytes);
    const blobPath = `blobs/sha256/${digest.slice(0, 2)}/${digest}`;

    const rawSnapshot = makeSnapshot([
      ["types/note.md", ["---", "typeId: note", "fields: {}", "---", ""].join("\n")],
      ["records/note-1.md", ["---", "typeId: note", "recordId: one", "fields: {}", "---", `See [[gdblob:sha256-${digest}]].`].join("\n")],
      [blobPath, blobBytes]
    ]);

    const canonical = canonicalizeDatasetSnapshot(rawSnapshot);
    const zipBytes = exportDatasetZipBytes(canonical);
    const roundTripped = loadRepoSnapshotFromZipBytes(zipBytes);
    const paths = [...roundTripped.files.keys()];
    expect(paths).toContain(blobPath);
    expect(paths).toContain("types/note.md");
    expect(paths).toContain("records/note.one/one.md");
  });

  it("GC-001: reachable blob set includes references from fields", () => {
    const blobBytes = encoder.encode("orchid");
    const digest = hash(blobBytes);
    const blobPath = `blobs/sha256/${digest.slice(0, 2)}/${digest}`;

    const rawSnapshot = makeSnapshot([
      ["types/photo.md", ["---", "typeId: photo", "fields: {}", "---", ""].join("\n")],
      [
        "records/photo-1.md",
        ["---", "typeId: photo", "recordId: one", "fields:", `  note: "[[gdblob:sha256-${digest}]]"`, "---", "Body"].join("\n")
      ],
      [blobPath, blobBytes]
    ]);

    const canonical = canonicalizeDatasetSnapshot(rawSnapshot);
    const zipBytes = exportDatasetZipBytes(canonical);
    const roundTripped = loadRepoSnapshotFromZipBytes(zipBytes);
    const paths = [...roundTripped.files.keys()];
    expect(paths).toContain(blobPath);
  });

  it("GC-002: export excludes unreferenced blobs after canonicalization", () => {
    const blobBytes = encoder.encode("flower");
    const digest = hash(blobBytes);
    const blobPath = `blobs/sha256/${digest.slice(0, 2)}/${digest}`;

    const rawSnapshot = makeSnapshot([
      ["types/note.md", ["---", "typeId: note", "fields: {}", "---", ""].join("\n")],
      ["records/note-1.md", ["---", "typeId: note", "recordId: one", "fields: {}", "---", `See [[gdblob:sha256-${digest}]].`].join("\n")],
      [blobPath, blobBytes],
      ["blobs/sha256/aa/aa" + "0".repeat(62), encoder.encode("garbage blob")]
    ]);

    const canonical = canonicalizeDatasetSnapshot(rawSnapshot);
    const zipBytes = exportDatasetZipBytes(canonical);
    const roundTripped = loadRepoSnapshotFromZipBytes(zipBytes);
    const paths = [...roundTripped.files.keys()];
    expect(paths).not.toContain("blobs/sha256/aa/aa" + "0".repeat(62));
  });
});
