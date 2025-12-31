const assert = require('node:assert/strict');
const test = require('node:test');

const { extractWikiLinks } = require('../dist/core');

test('REL-001: extracts ids from wiki-link tokens', () => {
  assert.deepEqual(extractWikiLinks('see [[a]] and [[b]]'), ['a', 'b']);
});

test('REL-001: ignores wiki-link alias text', () => {
  assert.deepEqual(extractWikiLinks('[[id|alias]]'), ['id']);
});
