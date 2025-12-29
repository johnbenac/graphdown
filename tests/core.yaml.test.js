const assert = require('node:assert/strict');
const test = require('node:test');

const { parseYamlObject } = require('../dist/core');

test('parseYamlObject parses YAML objects', () => {
  assert.deepEqual(parseYamlObject('a: 1'), { a: 1 });
});

test('parseYamlObject throws on invalid YAML', () => {
  assert.throws(() => parseYamlObject('a: [1, 2'), /./);
});

test('parseYamlObject throws when YAML is not an object', () => {
  assert.throws(
    () => parseYamlObject('- a\n- b'),
    /YAML front matter is not a valid object/
  );
  assert.throws(
    () => parseYamlObject('hello'),
    /YAML front matter is not a valid object/
  );
  assert.throws(
    () => parseYamlObject(''),
    /YAML front matter is not a valid object/
  );
});
