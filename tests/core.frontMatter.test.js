const assert = require('node:assert/strict');
const test = require('node:test');

const { extractFrontMatter } = require('../dist/core');

test('extractFrontMatter returns yaml and body', () => {
  const input = ['---', 'title: Test', '---', 'Body text'].join('\n');
  const result = extractFrontMatter(input);

  assert.equal(result.yaml, 'title: Test');
  assert.equal(result.body, 'Body text');
});

test('extractFrontMatter throws on missing front matter', () => {
  assert.throws(() => extractFrontMatter('No front matter here'), /Missing YAML front matter delimiter/);
});
