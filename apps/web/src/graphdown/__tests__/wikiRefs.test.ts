import assert from "node:assert/strict";
import { test } from "vitest";

import { extractRecordRefs, extractCidRefs } from "..";

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
  assert.deepEqual(result, {
    cids: [HELLO_CID],
    invalidCidTokens: [],
    legacyBlobTokens: []
  });
});

test('CID-REF-002: ignores non-CID wiki links', () => {
  const result = extractCidRefs('[[not-a-cid]]');
  assert.deepEqual(result, {
    cids: [],
    invalidCidTokens: [],
    legacyBlobTokens: []
  });
});

test('CID-REF-003: reports legacy blob tokens', () => {
  const legacy = 'gdblob:sha256-' + 'a'.repeat(64);
  const result = extractCidRefs(`[[${legacy}]]`);
  assert.deepEqual(result, {
    cids: [],
    invalidCidTokens: [],
    legacyBlobTokens: [legacy]
  });
});

test('REL-001: legacy blob references are not treated as record relationships', () => {
  assert.deepEqual(extractRecordRefs('see [[gdblob:sha256-' + 'a'.repeat(64) + ']]'), []);
});
