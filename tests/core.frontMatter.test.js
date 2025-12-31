const assert = require('node:assert/strict');
const test = require('node:test');

const { extractFrontMatter } = require('../dist/core');

test('FR-MD-020: extracts yaml and body for valid front matter', () => {
  const content = ['---', 'id: dataset:demo', '---', 'Body text'].join('\n');
  const result = extractFrontMatter(content);

  assert.equal(result.yaml.trim(), 'id: dataset:demo');
  assert.equal(result.body, 'Body text');
});

test('FR-MD-020: missing YAML front matter fails parsing', () => {
  assert.throws(
    () => extractFrontMatter('no front matter here'),
    /Missing YAML front matter delimiter at top of file/
  );
});
