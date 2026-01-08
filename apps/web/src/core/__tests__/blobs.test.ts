import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "vitest";

import { validateDatasetSnapshot, computeBlobDigest } from "../../core";
import type { DatasetSnapshot, ValidateDatasetResult, ValidationError } from "../../core";

const encoder = new TextEncoder();

type SnapshotEntry = [string, string | Uint8Array];

function snapshot(entries: SnapshotEntry[]): DatasetSnapshot {
  return {
    files: new Map<string, Uint8Array>(
      entries.map(([path, content]) => [path, typeof content === "string" ? encoder.encode(content) : content])
    )
  };
}

function record(path: string, yamlLines: string[], body = ""): SnapshotEntry {
  return [
    path,
    ["---", ...yamlLines, "---", body].join("\n")
  ];
}

function blobPathFor(digest: string): string {
  return `blobs/sha256/${digest.slice(0, 2)}/${digest}`;
}

function expectErrors(result: ValidateDatasetResult): ValidationError[] {
  if (result.ok) {
    assert.fail("Expected validation errors");
  }
  return result.errors;
}

function expectOk(result: ValidateDatasetResult): void {
  if (!result.ok) {
    assert.fail(JSON.stringify(result.errors));
  }
}

test('BLOB-001: computeBlobDigest hashes raw bytes', () => {
  const bytes = encoder.encode("abc");
  const expected = createHash("sha256").update(bytes).digest("hex");
  assert.equal(computeBlobDigest(bytes), expected);
});

test('VAL-BLOB-001: referenced blob must exist', () => {
  const blobBytes = encoder.encode("flower");
  const digest = createHash("sha256").update(blobBytes).digest("hex");
  const result = validateDatasetSnapshot(
    snapshot([
      record("types/photo.md", ["typeId: photo", "fields: {}"]),
      record("records/photo-1.md", ["typeId: photo", "recordId: one", "fields: {}"], `[[gdblob:sha256-${digest}]]`)
    ])
  );
  const errors = expectErrors(result);
  assert.ok(errors.some((e) => e.code === "E_BLOB_REFERENCE_MISSING"));
});

test('VAL-BLOB-002: blob bytes must match referenced digest', () => {
  const blobBytes = encoder.encode("flower");
  const digest = createHash("sha256").update(blobBytes).digest("hex");
  const badBytes = encoder.encode("flower2");
  const result = validateDatasetSnapshot(
    snapshot([
      record("types/photo.md", ["typeId: photo", "fields: {}"]),
      record("records/photo-1.md", ["typeId: photo", "recordId: one", "fields: {}"], `[[gdblob:sha256-${digest}]]`),
      [blobPathFor(digest), badBytes]
    ])
  );
  const errors = expectErrors(result);
  assert.ok(errors.some((e) => e.code === "E_BLOB_DIGEST_MISMATCH"));
});

test('BLOB-LAYOUT-002: invalid blob path shape fails validation', () => {
  const blobBytes = encoder.encode("flower");
  const digest = createHash("sha256").update(blobBytes).digest("hex");
  const result = validateDatasetSnapshot(
    snapshot([
      record("types/photo.md", ["typeId: photo", "fields: {}"]),
      record("records/photo-1.md", ["typeId: photo", "recordId: one", "fields: {}"], `[[gdblob:sha256-${digest}]]`),
      ["blobs/sha256/nothex/" + digest, blobBytes]
    ])
  );
  const errors = expectErrors(result);
  assert.ok(errors.some((e) => e.code === "E_BLOB_PATH_INVALID"));
});

test('BLOB-LAYOUT-001: canonical blob path is accepted', () => {
  const blobBytes = encoder.encode("rose");
  const digest = createHash("sha256").update(blobBytes).digest("hex");
  const result = validateDatasetSnapshot(
    snapshot([
      record("types/photo.md", ["typeId: photo", "fields: {}"]),
      record("records/photo-1.md", ["typeId: photo", "recordId: one", "fields: {}"], `[[gdblob:sha256-${digest}]]`),
      [blobPathFor(digest), blobBytes]
    ])
  );
  expectOk(result);
});

test('BLOB-REF-001: split strings do not synthesize blob references', () => {
  const digest = "a".repeat(64);
  const result = validateDatasetSnapshot(
    snapshot([
      record("types/photo.md", ["typeId: photo", "fields: {}"]),
      record(
        "records/photo-1.md",
        [
          "typeId: photo",
          "recordId: one",
          "fields:",
          `  head: "[[gdblob:sha256-${digest.slice(0, 10)}"`,
          `  tail: "${digest.slice(10)}]]"`
        ]
      )
    ])
  );
  expectOk(result);
});

test('GC-003: unreferenced but valid blobs do not fail validation', () => {
  const blobBytes = encoder.encode("tulip");
  const digest = createHash("sha256").update(blobBytes).digest("hex");
  const result = validateDatasetSnapshot(
    snapshot([
      record("types/photo.md", ["typeId: photo", "fields: {}"]),
      record("records/photo-1.md", ["typeId: photo", "recordId: one", "fields: {}"]),
      [blobPathFor(digest), blobBytes]
    ])
  );
  expectOk(result);
});

test('BLOB-LAYOUT-003: non-record, non-blob files are ignored by validation', () => {
  const result = validateDatasetSnapshot(
    snapshot([
      record("types/photo.md", ["typeId: photo", "fields: {}"]),
      record("records/photo-1.md", ["typeId: photo", "recordId: one", "fields: {}"]),
      ["misc/data.bin", encoder.encode("bytes")]
    ])
  );
  expectOk(result);
});
