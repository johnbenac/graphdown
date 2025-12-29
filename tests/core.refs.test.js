const assert = require('node:assert/strict');
const test = require('node:test');

const { normalizeRefs } = require('../dist/core');

test('normalizeRefs handles scalar values', () => {
  assert.deepEqual(normalizeRefs('x'), ['x']);
  assert.deepEqual(normalizeRefs('[[x]]'), ['x']);
});

test('normalizeRefs handles arrays', () => {
  assert.deepEqual(normalizeRefs(['x', '  y  ', '', null]), ['x', 'y']);
});
