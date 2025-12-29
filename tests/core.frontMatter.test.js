const assert = require('node:assert/strict');
const test = require('node:test');

const { extractFrontMatter } = require('../dist/core');

test('extractFrontMatter returns yaml and body', () => {
  const input = ['---', 'id: test', '---', 'Body text'].join('\n');
  const result = extractFrontMatter(input);

  assert.equal(result.yaml, 'id: test');
  assert.equal(result.body, 'Body text');
});

test('extractFrontMatter throws when missing front matter', () => {
  assert.throws(() => extractFrontMatter('no front matter'), /Missing YAML front matter delimiter/);
});
