import assert from "node:assert/strict";
import { test } from "vitest";
import { sha256 } from "@noble/hashes/sha256";

import { cidFromRawBytes, decodeDaslCidString } from "..";

const encoder = new TextEncoder();

function utf8(value: string): Uint8Array {
  return encoder.encode(value);
}

test("CID-001: empty bytes CID vector", () => {
  const cid = cidFromRawBytes(new Uint8Array());
  assert.equal(cid, "bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku");
});

test("CID-002: hello CID vector", () => {
  const cid = cidFromRawBytes(utf8("hello"));
  assert.equal(cid, "bafkreibm6jg3ux5qumhcn2b3flc3tyu6dmlb4xa7u5bf44yegnrjhc4yeq");
});

test("CID-003: abc CID vector", () => {
  const cid = cidFromRawBytes(utf8("abc"));
  assert.equal(cid, "bafkreif2pall7dybz7vecqka3zo24irdwabwdi4wc55jznaq75q7eaavvu");
});

test("CID-004: decode exposes raw codec and digest", () => {
  const bytes = utf8("hello");
  const cid = cidFromRawBytes(bytes);
  const decoded = decodeDaslCidString(cid);
  assert.equal(decoded.codec, "raw");
  assert.deepEqual(decoded.digest, sha256(bytes));
});
