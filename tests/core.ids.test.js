const assert = require('node:assert/strict');
const test = require('node:test');

const { parseGraphdownText } = require('../dist/core');

function parse(text) {
  return parseGraphdownText('test.md', text);
}

test('ID-001: rejects typeId with invalid characters', () => {
  const result = parse(
    ['---', 'typeId: invalid id', 'fields: {}', '---', 'body'].join('\n')
  );
  assert.equal(result.kind, 'error');
  assert.equal(result.error.code, 'E_INVALID_IDENTIFIER');
});

test('ID-001: rejects recordId with colon', () => {
  const result = parse(
    ['---', 'typeId: note', 'recordId: bad:id', 'fields: {}', '---', 'body'].join('\n')
  );
  assert.equal(result.kind, 'error');
  assert.equal(result.error.code, 'E_INVALID_IDENTIFIER');
});

test('ID-002: rejects reserved gdblob typeId', () => {
  const result = parse(
    ['---', 'typeId: gdblob', 'fields: {}', '---', 'body'].join('\n')
  );
  assert.equal(result.kind, 'error');
  assert.equal(result.error.code, 'E_INVALID_IDENTIFIER');
});

test('ID-001: accepts valid identifiers', () => {
  const typeResult = parse(['---', 'typeId: note', 'fields: {}', '---', 'body'].join('\n'));
  assert.equal(typeResult.kind, 'type');
  const recordResult = parse(
    ['---', 'typeId: note', 'recordId: rec_1', 'fields: {}', '---', 'body'].join('\n')
  );
  assert.equal(recordResult.kind, 'record');
});
