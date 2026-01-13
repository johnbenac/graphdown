import assert from "node:assert/strict";
import { test } from "vitest";

import { extractFrontMatter } from "..";

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

test('FR-MD-020: parses YAML front matter with CR-only line endings', () => {
  const content = ['---', 'id: dataset:demo', '---', 'Body text'].join('\r');
  const result = extractFrontMatter(content);

  assert.equal(result.yaml.trim(), 'id: dataset:demo');
  assert.equal(result.body, 'Body text');
});
