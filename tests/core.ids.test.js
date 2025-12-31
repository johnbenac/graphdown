const assert = require('node:assert/strict');
const test = require('node:test');

const { cleanId } = require('../dist/core');

test('REL-003: cleanId trims whitespace', () => {
  assert.equal(cleanId('  abc  '), 'abc');
});

test('REL-003: cleanId unwraps [[...]] tokens', () => {
  assert.equal(cleanId('[[abc]]'), 'abc');
  assert.equal(cleanId('[[ abc ]]'), 'abc');
});

test('REL-003: cleanId returns null for blank strings', () => {
  assert.equal(cleanId(''), null);
  assert.equal(cleanId('   '), null);
});

test('REL-003: cleanId returns null for non-strings', () => {
  assert.equal(cleanId(null), null);
  assert.equal(cleanId(42), null);
});
