import assert from "node:assert/strict";
import { test } from "vitest";
import { sha256 } from "@noble/hashes/sha256";

import { cidFromRawBytes, decodeDaslCidString } from "..";

const encoder = new TextEncoder();

function utf8(input: string): Uint8Array {
  return encoder.encode(input);
}

test("CID-001: cidFromRawBytes handles empty input", () => {
  const cid = cidFromRawBytes(new Uint8Array());
  assert.equal(cid, "bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku");
});

test("CID-002: cidFromRawBytes handles hello", () => {
  const cid = cidFromRawBytes(utf8("hello"));
  assert.equal(cid, "bafkreibm6jg3ux5qumhcn2b3flc3tyu6dmlb4xa7u5bf44yegnrjhc4yeq");
});

test("CID-003: cidFromRawBytes handles abc", () => {
  const cid = cidFromRawBytes(utf8("abc"));
  assert.equal(cid, "bafkreif2pall7dybz7vecqka3zo24irdwabwdi4wc55jznaq75q7eaavvu");
});

test("CID-004: decodeDaslCidString round-trips and exposes digest", () => {
  const bytes = utf8("hello");
  const cid = cidFromRawBytes(bytes);
  const decoded = decodeDaslCidString(cid);
  assert.equal(decoded.codec, "raw");
  assert.equal(Buffer.compare(Buffer.from(decoded.digest), Buffer.from(sha256(bytes))), 0);
  assert.equal(cid, cidFromRawBytes(bytes));
});

test("BLOCK-001: digest embedded in CID is sha2-256(bytes)", () => {
  const bytes = utf8("hello");
  const cid = cidFromRawBytes(bytes);
  const decoded = decodeDaslCidString(cid);
  assert.equal(Buffer.compare(Buffer.from(decoded.digest), Buffer.from(sha256(bytes))), 0);
});
