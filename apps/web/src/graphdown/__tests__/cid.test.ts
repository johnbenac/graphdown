import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "vitest";

import { cidFromRawBytes, decodeDaslCidString } from "..";

const encoder = new TextEncoder();

function sha256(bytes: Uint8Array): Uint8Array {
  return new Uint8Array(createHash("sha256").update(bytes).digest());
}

test("BLOCK-002: cidFromRawBytes for empty bytes matches golden vector", () => {
  const cid = cidFromRawBytes(new Uint8Array());
  assert.equal(cid, "bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku");
});

test("BLOCK-002: cidFromRawBytes for hello matches golden vector", () => {
  const cid = cidFromRawBytes(encoder.encode("hello"));
  assert.equal(cid, "bafkreibm6jg3ux5qumhcn2b3flc3tyu6dmlb4xa7u5bf44yegnrjhc4yeq");
});

test("BLOCK-002: cidFromRawBytes for abc matches golden vector", () => {
  const cid = cidFromRawBytes(encoder.encode("abc"));
  assert.equal(cid, "bafkreif2pall7dybz7vecqka3zo24irdwabwdi4wc55jznaq75q7eaavvu");
});

test("BLOCK-002: decodeDaslCidString exposes raw codec and sha256 digest", () => {
  const bytes = encoder.encode("hello");
  const cid = cidFromRawBytes(bytes);
  const decoded = decodeDaslCidString(cid);
  assert.equal(decoded.codec, "raw");
  assert.deepEqual(decoded.digest, sha256(bytes));
});
