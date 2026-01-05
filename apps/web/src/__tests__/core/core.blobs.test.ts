import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { computeBlobDigest, validateDatasetSnapshot } from "../../core";

const encoder = new TextEncoder();

function snapshot(entries: Array<[string, string | Uint8Array]>) {
  return {
    files: new Map(
      entries.map(([path, content]) => [path, typeof content === "string" ? encoder.encode(content) : content])
    )
  };
}

function record(path: string, yamlLines: string[], body = "") {
  return [path, ["---", ...yamlLines, "---", body].join("\n")] as [string, string];
}

function blobPathFor(digest: string) {
  return `blobs/sha256/${digest.slice(0, 2)}/${digest}`;
}

describe("core blobs", () => {
  it("BLOB-001: computeBlobDigest hashes raw bytes", () => {
    const bytes = encoder.encode("abc");
    const expected = createHash("sha256").update(bytes).digest("hex");
    expect(computeBlobDigest(bytes)).toBe(expected);
  });

  it("VAL-BLOB-001: referenced blob must exist", () => {
    const blobBytes = encoder.encode("flower");
    const digest = createHash("sha256").update(blobBytes).digest("hex");
    const result = validateDatasetSnapshot(
      snapshot([
        record("types/photo.md", ["typeId: photo", "fields: {}"]),
        record(
          "records/photo-1.md",
          ["typeId: photo", "recordId: one", "fields: {}"],
          `[[gdblob:sha256-${digest}]]`
        )
      ])
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.code === "E_BLOB_REFERENCE_MISSING")).toBe(true);
    }
  });

  it("VAL-BLOB-002: blob bytes must match referenced digest", () => {
    const blobBytes = encoder.encode("flower");
    const digest = createHash("sha256").update(blobBytes).digest("hex");
    const badBytes = encoder.encode("flower2");
    const result = validateDatasetSnapshot(
      snapshot([
        record("types/photo.md", ["typeId: photo", "fields: {}"]),
        record(
          "records/photo-1.md",
          ["typeId: photo", "recordId: one", "fields: {}"],
          `[[gdblob:sha256-${digest}]]`
        ),
        [blobPathFor(digest), badBytes]
      ])
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.code === "E_BLOB_DIGEST_MISMATCH")).toBe(true);
    }
  });

  it("BLOB-LAYOUT-002: invalid blob path shape fails validation", () => {
    const blobBytes = encoder.encode("flower");
    const digest = createHash("sha256").update(blobBytes).digest("hex");
    const result = validateDatasetSnapshot(
      snapshot([
        record("types/photo.md", ["typeId: photo", "fields: {}"]),
        record(
          "records/photo-1.md",
          ["typeId: photo", "recordId: one", "fields: {}"],
          `[[gdblob:sha256-${digest}]]`
        ),
        ["blobs/sha256/nothex/" + digest, blobBytes]
      ])
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.code === "E_BLOB_PATH_INVALID")).toBe(true);
    }
  });

  it("BLOB-LAYOUT-001: canonical blob path is accepted", () => {
    const blobBytes = encoder.encode("rose");
    const digest = createHash("sha256").update(blobBytes).digest("hex");
    const result = validateDatasetSnapshot(
      snapshot([
        record("types/photo.md", ["typeId: photo", "fields: {}"]),
        record(
          "records/photo-1.md",
          ["typeId: photo", "recordId: one", "fields: {}"],
          `[[gdblob:sha256-${digest}]]`
        ),
        [blobPathFor(digest), blobBytes]
      ])
    );
    expect(result.ok).toBe(true);
  });

  it("BLOB-REF-001: split strings do not synthesize blob references", () => {
    const digest = "a".repeat(64);
    const result = validateDatasetSnapshot(
      snapshot([
        record("types/photo.md", ["typeId: photo", "fields: {}"]),
        record("records/photo-1.md", [
          "typeId: photo",
          "recordId: one",
          "fields:",
          `  head: "[[gdblob:sha256-${digest.slice(0, 10)}"`,
          `  tail: "${digest.slice(10)}]]"`
        ])
      ])
    );
    expect(result.ok).toBe(true);
  });

  it("GC-003: unreferenced but valid blobs do not fail validation", () => {
    const blobBytes = encoder.encode("tulip");
    const digest = createHash("sha256").update(blobBytes).digest("hex");
    const result = validateDatasetSnapshot(
      snapshot([
        record("types/photo.md", ["typeId: photo", "fields: {}"]),
        record("records/photo-1.md", ["typeId: photo", "recordId: one", "fields: {}"]),
        [blobPathFor(digest), blobBytes]
      ])
    );
    expect(result.ok).toBe(true);
  });

  it("BLOB-LAYOUT-003: non-record, non-blob files are ignored by validation", () => {
    const result = validateDatasetSnapshot(
      snapshot([
        record("types/photo.md", ["typeId: photo", "fields: {}"]),
        record("records/photo-1.md", ["typeId: photo", "recordId: one", "fields: {}"]),
        ["misc/data.bin", encoder.encode("bytes")]
      ])
    );
    expect(result.ok).toBe(true);
  });
});
