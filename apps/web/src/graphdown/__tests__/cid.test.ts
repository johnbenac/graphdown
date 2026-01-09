import assert from "node:assert/strict";
import { sha256 } from "@noble/hashes/sha256";
import { test } from "vitest";

import { cidFromRawBytes, decodeDaslCidString } from "..";

const encoder = new TextEncoder();

function utf8(value: string): Uint8Array {
  return encoder.encode(value);
}

test("CID-002: cidFromRawBytes matches empty bytes vector", () => {
  assert.equal(
    cidFromRawBytes(new Uint8Array()),
    "bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku"
  );
});

test("CID-002: cidFromRawBytes matches hello", () => {
  assert.equal(
    cidFromRawBytes(utf8("hello")),
    "bafkreibm6jg3ux5qumhcn2b3flc3tyu6dmlb4xa7u5bf44yegnrjhc4yeq"
  );
});

test("CID-002: cidFromRawBytes matches abc", () => {
  assert.equal(
    cidFromRawBytes(utf8("abc")),
    "bafkreif2pall7dybz7vecqka3zo24irdwabwdi4wc55jznaq75q7eaavvu"
  );
});

test("CID-001: decodeDaslCidString reports raw codec and digest", () => {
  const bytes = utf8("hello");
  const cid = cidFromRawBytes(bytes);
  const decoded = decodeDaslCidString(cid);
  assert.equal(decoded.codec, "raw");
  assert.deepEqual(decoded.digest, sha256(bytes));
});
