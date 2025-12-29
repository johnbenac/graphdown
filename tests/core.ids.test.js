const assert = require('node:assert/strict');
const test = require('node:test');

const { cleanId } = require('../dist/core');

test('cleanId trims strings', () => {
  assert.equal(cleanId('  abc  '), 'abc');
});

test('cleanId unwraps wiki links', () => {
  assert.equal(cleanId('[[abc]]'), 'abc');
  assert.equal(cleanId('[[ abc ]]'), 'abc');
});

test('cleanId returns null for blanks', () => {
  assert.equal(cleanId(''), null);
  assert.equal(cleanId('   '), null);
});

test('cleanId returns null for non-strings', () => {
  assert.equal(cleanId(123), null);
});
