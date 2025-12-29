const assert = require('node:assert/strict');
const test = require('node:test');

const { cleanId } = require('../dist/core');

test('cleanId trims whitespace', () => {
  assert.equal(cleanId('  abc  '), 'abc');
});

test('cleanId unwraps wiki-style ids', () => {
  assert.equal(cleanId('[[abc]]'), 'abc');
  assert.equal(cleanId('[[ abc ]]'), 'abc');
});

test('cleanId returns null for empty strings', () => {
  assert.equal(cleanId(''), null);
  assert.equal(cleanId('   '), null);
});

test('cleanId returns null for non-string values', () => {
  assert.equal(cleanId(null), null);
  assert.equal(cleanId(42), null);
});
