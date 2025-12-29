const assert = require('node:assert/strict');
const test = require('node:test');

const { extractWikiLinks } = require('../dist/core');

test('extractWikiLinks finds basic links', () => {
  assert.deepEqual(extractWikiLinks('see [[a]] and [[b]]'), ['a', 'b']);
});

test('extractWikiLinks supports alias syntax', () => {
  assert.deepEqual(extractWikiLinks('[[id|alias]]'), ['id']);
});
