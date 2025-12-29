const assert = require('node:assert/strict');
const test = require('node:test');

const { extractWikiLinks } = require('../dist/core');

test('extractWikiLinks returns ids for wiki links', () => {
  assert.deepEqual(extractWikiLinks('see [[a]] and [[b]]'), ['a', 'b']);
});

test('extractWikiLinks ignores alias text', () => {
  assert.deepEqual(extractWikiLinks('[[id|alias]]'), ['id']);
});
