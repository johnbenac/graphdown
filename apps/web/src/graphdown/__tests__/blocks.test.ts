import assert from "node:assert/strict";
import { test } from "vitest";

import { blockPathForCid, cidFromRawBytes, decodeDaslCidString, validateDatasetSnapshot } from "..";
import { encodeBase32 } from "../cid/base32";
import type { DatasetSnapshot, ValidateDatasetResult, ValidationError } from "..";

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

test("VAL-BLOCK-001: referenced block must exist", () => {
  const blockBytes = encoder.encode("flower");
  const cid = cidFromRawBytes(blockBytes);
  const result = validateDatasetSnapshot(
    snapshot([
      record("types/photo.md", ["typeId: photo", "fields: {}"]),
      record("records/photo-1.md", ["typeId: photo", "recordId: one", "fields: {}"], `[[${cid}]]`)
    ])
  );
  const errors = expectErrors(result);
  assert.ok(errors.some((e) => e.code === "E_BLOCK_REFERENCE_MISSING"));
});

test("VAL-BLOCK-002: block bytes must match referenced CID digest", () => {
  const blockBytes = encoder.encode("flower");
  const cid = cidFromRawBytes(blockBytes);
  const badBytes = encoder.encode("flower2");
  const result = validateDatasetSnapshot(
    snapshot([
      record("types/photo.md", ["typeId: photo", "fields: {}"]),
      record("records/photo-1.md", ["typeId: photo", "recordId: one", "fields: {}"], `[[${cid}]]`),
      [blockPathForCid(cid), badBytes]
    ])
  );
  const errors = expectErrors(result);
  assert.ok(errors.some((e) => e.code === "E_BLOCK_DIGEST_MISMATCH"));
});

test("BLOCK-LAYOUT-002: invalid block path shape fails validation", () => {
  const blockBytes = encoder.encode("flower");
  const cid = cidFromRawBytes(blockBytes);
  const result = validateDatasetSnapshot(
    snapshot([
      record("types/photo.md", ["typeId: photo", "fields: {}"]),
      record("records/photo-1.md", ["typeId: photo", "recordId: one", "fields: {}"], `[[${cid}]]`),
      [`blocks/sha2-256/nothex/${cid}`, blockBytes]
    ])
  );
  const errors = expectErrors(result);
  assert.ok(errors.some((e) => e.code === "E_BLOCK_PATH_INVALID"));
});

test("BLOCK-LAYOUT-002: reserved blocks namespace rejects non-canonical files", () => {
  const result = validateDatasetSnapshot(
    snapshot([
      record("types/photo.md", ["typeId: photo", "fields: {}"]),
      record("records/photo-1.md", ["typeId: photo", "recordId: one", "fields: {}"]),
      ["blocks/readme.md", encoder.encode("nope")]
    ])
  );
  const errors = expectErrors(result);
  assert.ok(errors.some((e) => e.code === "E_BLOCK_PATH_INVALID"));
});

test("BLOCK-LAYOUT-001: canonical block path is accepted", () => {
  const blockBytes = encoder.encode("rose");
  const cid = cidFromRawBytes(blockBytes);
  const result = validateDatasetSnapshot(
    snapshot([
      record("types/photo.md", ["typeId: photo", "fields: {}"]),
      record("records/photo-1.md", ["typeId: photo", "recordId: one", "fields: {}"], `[[${cid}]]`),
      [blockPathForCid(cid), blockBytes]
    ])
  );
  expectOk(result);
});

test("VAL-CID-001: CID-shaped tokens that fail decoding are invalid", () => {
  const blockBytes = encoder.encode("orchid");
  const validCid = cidFromRawBytes(blockBytes);
  const decoded = decodeDaslCidString(validCid);
  const invalidBytes = Uint8Array.from(decoded.cidBytes);
  invalidBytes[0] = 0x02;
  const invalidCid = `b${encodeBase32(invalidBytes)}`;
  const result = validateDatasetSnapshot(
    snapshot([
      record("types/photo.md", ["typeId: photo", "fields: {}"]),
      record("records/photo-1.md", ["typeId: photo", "recordId: one", "fields: {}"], `[[${invalidCid}]]`)
    ])
  );
  const errors = expectErrors(result);
  assert.ok(errors.some((e) => e.code === "E_CID_INVALID"));
});

test("CID-REF-001: split strings do not synthesize CID references", () => {
  const cid = cidFromRawBytes(encoder.encode("tulip"));
  const result = validateDatasetSnapshot(
    snapshot([
      record("types/photo.md", ["typeId: photo", "fields: {}"]),
      record(
        "records/photo-1.md",
        [
          "typeId: photo",
          "recordId: one",
          "fields:",
          `  head: "[[${cid.slice(0, 10)}"`,
          `  tail: "${cid.slice(10)}]]"`
        ]
      )
    ])
  );
  expectOk(result);
});

test("GC-003: unreferenced but valid blocks do not fail validation", () => {
  const blockBytes = encoder.encode("tulip");
  const cid = cidFromRawBytes(blockBytes);
  const result = validateDatasetSnapshot(
    snapshot([
      record("types/photo.md", ["typeId: photo", "fields: {}"]),
      record("records/photo-1.md", ["typeId: photo", "recordId: one", "fields: {}"]),
      [blockPathForCid(cid), blockBytes]
    ])
  );
  expectOk(result);
});

test("BLOCK-LAYOUT-003: non-record, non-block files are ignored by validation", () => {
  const result = validateDatasetSnapshot(
    snapshot([
      record("types/photo.md", ["typeId: photo", "fields: {}"]),
      record("records/photo-1.md", ["typeId: photo", "recordId: one", "fields: {}"]),
      ["misc/data.bin", encoder.encode("bytes")]
    ])
  );
  expectOk(result);
});

test("CID-LEGACY-001: legacy blob references are rejected", () => {
  const digest = "a".repeat(64);
  const result = validateDatasetSnapshot(
    snapshot([
      record("types/photo.md", ["typeId: photo", "fields: {}"]),
      record("records/photo-1.md", ["typeId: photo", "recordId: one", "fields: {}"], `[[gdblob:sha256-${digest}]]`)
    ])
  );
  const errors = expectErrors(result);
  assert.ok(errors.some((e) => e.code === "E_LEGACY_BLOB_REF"));
});

test("CID-LEGACY-002: legacy blob store paths are rejected", () => {
  const result = validateDatasetSnapshot(
    snapshot([
      record("types/photo.md", ["typeId: photo", "fields: {}"]),
      record("records/photo-1.md", ["typeId: photo", "recordId: one", "fields: {}"]),
      ["blobs/sha256/aa/" + "a".repeat(64), encoder.encode("legacy")]
    ])
  );
  const errors = expectErrors(result);
  assert.ok(errors.some((e) => e.code === "E_LEGACY_BLOB_STORE"));
});
