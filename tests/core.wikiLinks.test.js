const assert = require('node:assert/strict');
const test = require('node:test');

const { extractWikiLinks } = require('../dist/core');

test('extractWikiLinks finds wiki link ids', () => {
  assert.deepEqual(extractWikiLinks('see [[a]] and [[b]]'), ['a', 'b']);
});

test('extractWikiLinks supports aliases', () => {
  assert.deepEqual(extractWikiLinks('[[id|alias]]'), ['id']);
});
