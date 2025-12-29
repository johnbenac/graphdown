const assert = require('node:assert/strict');
const test = require('node:test');

const { cleanId } = require('../dist/core');

test('cleanId trims and unwraps IDs', () => {
  assert.equal(cleanId('  abc  '), 'abc');
  assert.equal(cleanId('[[abc]]'), 'abc');
  assert.equal(cleanId('[[ abc ]]'), 'abc');
});

test('cleanId returns null for blank or non-string values', () => {
  assert.equal(cleanId(''), null);
  assert.equal(cleanId('   '), null);
  assert.equal(cleanId(null), null);
  assert.equal(cleanId(42), null);
});
