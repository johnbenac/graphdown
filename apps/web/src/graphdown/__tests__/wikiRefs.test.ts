import assert from "node:assert/strict";
import { test } from "vitest";

import { extractCidRefs, extractRecordRefs } from "..";

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
  const cid = 'bafkreibm6jg3ux5qumhcn2b3flc3tyu6dmlb4xa7u5bf44yegnrjhc4yeq';
  assert.deepEqual(
    extractCidRefs(`see [[${cid}]]`),
    { cids: [cid], invalidCidTokens: [], legacyBlobTokens: [] }
  );
});

test('CID-REF-002: ignores non-CID tokens', () => {
  assert.deepEqual(
    extractCidRefs('[[ note:one ]] [[not-a-cid]]'),
    { cids: [], invalidCidTokens: [], legacyBlobTokens: [] }
  );
});

test('CID-LEGACY-001: reports legacy blob tokens', () => {
  const legacy = 'gdblob:sha256-' + 'a'.repeat(64);
  assert.deepEqual(
    extractCidRefs(`see [[${legacy}]]`),
    { cids: [], invalidCidTokens: [], legacyBlobTokens: [legacy] }
  );
});

test('REL-001: legacy blob references are not treated as record relationships', () => {
  assert.deepEqual(extractRecordRefs('see [[gdblob:sha256-' + 'a'.repeat(64) + ']]'), []);
});
