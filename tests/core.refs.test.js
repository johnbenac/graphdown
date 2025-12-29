const assert = require('node:assert/strict');
const test = require('node:test');

const { normalizeRefs } = require('../dist/core');

test('normalizeRefs wraps single values', () => {
  assert.deepEqual(normalizeRefs('x'), ['x']);
});

test('normalizeRefs cleans arrays and drops nulls', () => {
  assert.deepEqual(normalizeRefs(['x', '  y  ', '', null]), ['x', 'y']);
});

test('normalizeRefs cleans wiki-style values', () => {
  assert.deepEqual(normalizeRefs('[[x]]'), ['x']);
});
