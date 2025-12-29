const assert = require('node:assert/strict');
const test = require('node:test');

const { cleanId } = require('../dist/core');

test('cleanId trims and unwraps wiki links', () => {
  assert.equal(cleanId('  abc  '), 'abc');
  assert.equal(cleanId('[[abc]]'), 'abc');
  assert.equal(cleanId('[[ abc ]]'), 'abc');
});

test('cleanId returns null for empty or non-string values', () => {
  assert.equal(cleanId(''), null);
  assert.equal(cleanId('   '), null);
  assert.equal(cleanId(42), null);
});
