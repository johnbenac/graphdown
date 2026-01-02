const assert = require('node:assert/strict');
const test = require('node:test');

const { extractRecordRefs, extractBlobRefs } = require('../dist/core');

test('REL-003: extracts record references from wiki-link tokens', () => {
  assert.deepEqual(extractRecordRefs('see [[note:one]] and [[note:two]]'), ['note:one', 'note:two']);
});

test('REL-003: ignores malformed record tokens and aliases', () => {
  assert.deepEqual(
    extractRecordRefs('[[ note:one ]] [[note:bad:extra]] [[note|alias]] [[note-1]]'),
    ['note:one']
  );
});

test('BLOB-REF-001: extracts blob references', () => {
  assert.deepEqual(
    extractBlobRefs('see [[gdblob:sha256-' + 'a'.repeat(64) + ']]'),
    ['a'.repeat(64)]
  );
});

test('BLOB-REF-002: ignores malformed blob references', () => {
  const malformed = [
    '[[gdblob:sha256-]]',
    '[[gdblob:sha256-' + 'A'.repeat(64) + ']]',
    '[[gdblob:sha256-' + 'a'.repeat(63) + ']]',
    '[[note:one]]'
  ].join(' ');
  assert.deepEqual(extractBlobRefs(malformed), []);
});

test('REL-001: blob references are not treated as record relationships', () => {
  assert.deepEqual(extractRecordRefs('see [[gdblob:sha256-' + 'a'.repeat(64) + ']]'), []);
});
