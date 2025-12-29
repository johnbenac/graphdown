const assert = require('node:assert/strict');
const test = require('node:test');

const { extractFrontMatter } = require('../dist/core');

test('extractFrontMatter succeeds on valid front matter', () => {
  const input = ['---', 'id: test', '---', 'Body text'].join('\n');
  const result = extractFrontMatter(input);

  assert.equal(result.yaml.trim(), 'id: test');
  assert.equal(result.body.trim(), 'Body text');
});

test('extractFrontMatter throws on missing front matter', () => {
  assert.throws(() => extractFrontMatter('No front matter'), /Missing YAML front matter delimiter/);
});
