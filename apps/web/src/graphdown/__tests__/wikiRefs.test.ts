import assert from "node:assert/strict";
import { test } from "vitest";

import { extractCidRefs, extractRecordRefs } from "..";

const HELLO_CID = "bafkreibm6jg3ux5qumhcn2b3flc3tyu6dmlb4xa7u5bf44yegnrjhc4yeq";

test('REL-003: extracts record references from wiki-link tokens', () => {
  assert.deepEqual(extractRecordRefs('see [[note:one]] and [[note:two]]'), ['note:one', 'note:two']);
});

test('REL-003: ignores malformed record tokens and aliases', () => {
  assert.deepEqual(
    extractRecordRefs('[[ note:one ]] [[note:bad:extra]] [[note|alias]] [[note-1]]'),
    ['note:one']
  );
});

test('CID-REF-001: extracts CID references', () => {
  const result = extractCidRefs(`see [[${HELLO_CID}]]`);
  assert.deepEqual(result.cids, [HELLO_CID]);
  assert.deepEqual(result.invalidCidTokens, []);
  assert.deepEqual(result.legacyBlobTokens, []);
});

test('CID-REF-002: ignores non-CID tokens', () => {
  const result = extractCidRefs('see [[not-a-cid]]');
  assert.deepEqual(result.cids, []);
  assert.deepEqual(result.invalidCidTokens, []);
  assert.deepEqual(result.legacyBlobTokens, []);
});

test('LEGACY-001: flags legacy blob tokens', () => {
  const legacy = "gdblob:sha256-" + "a".repeat(64);
  const result = extractCidRefs(`see [[${legacy}]]`);
  assert.deepEqual(result.cids, []);
  assert.deepEqual(result.invalidCidTokens, []);
  assert.deepEqual(result.legacyBlobTokens, [legacy]);
});

test('REL-001: legacy blob references are not treated as record relationships', () => {
  const legacy = "gdblob:sha256-" + "a".repeat(64);
  assert.deepEqual(extractRecordRefs(`see [[${legacy}]]`), []);
});
