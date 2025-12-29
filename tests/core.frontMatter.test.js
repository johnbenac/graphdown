const assert = require('node:assert/strict');
const test = require('node:test');

const { extractFrontMatter } = require('../dist/core');

test('extractFrontMatter returns yaml and body for valid front matter', () => {
  const content = ['---', 'id: dataset:demo', '---', 'Body text'].join('\n');
  const result = extractFrontMatter(content);

  assert.equal(result.yaml.trim(), 'id: dataset:demo');
  assert.equal(result.body, 'Body text');
});

test('extractFrontMatter throws when front matter is missing', () => {
  assert.throws(
    () => extractFrontMatter('no front matter here'),
    /Missing YAML front matter delimiter at top of file/
  );
});
