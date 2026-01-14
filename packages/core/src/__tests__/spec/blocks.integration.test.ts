import assert from "node:assert/strict";
import { test } from "vitest";

import { encodeBase32 } from "../../cid/base32";
import { blockPathForCid, cidFromRawBytes, validateDatasetSnapshot } from "../..";
import type { DatasetSnapshot, ValidateDatasetResult, ValidationError } from "../..";

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

test("BLOCK-LAYOUT-002: blocks namespace is fully reserved", () => {
  const result = validateDatasetSnapshot(
    snapshot([
      record("types/photo.md", ["typeId: photo", "fields: {}"]),
      record("records/photo-1.md", ["typeId: photo", "recordId: one", "fields: {}"]),
      ["blocks/readme.md", "nope"]
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

test("VAL-CID-001: invalid CID-shaped tokens fail validation", () => {
  const invalidCidBytes = Uint8Array.of(0x02, 0x55, 0x12, 0x20, ...new Uint8Array(32));
  const invalidCid = `b${encodeBase32(invalidCidBytes)}`;
  const result = validateDatasetSnapshot(
    snapshot([
      record("types/photo.md", ["typeId: photo", "fields: {}"]),
      record("records/photo-1.md", ["typeId: photo", "recordId: one", "fields: {}"], `[[${invalidCid}]]`)
    ])
  );
  const errors = expectErrors(result);
  assert.ok(errors.some((e) => e.code === "E_CID_INVALID"));
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
