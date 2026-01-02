const assert = require('node:assert/strict');
const test = require('node:test');

const { parseGraphdownText, validateDatasetSnapshot } = require('../dist/core');

const encoder = new TextEncoder();

function snapshot(entries) {
  return { files: new Map(entries.map(([path, content]) => [path, encoder.encode(content)])) };
}

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

test('TYPE-002: duplicate typeId fails validation', () => {
  const typeA = ['types/a.md', ['---', 'typeId: note', 'fields: {}', '---'].join('\n')];
  const typeB = ['types/b.md', ['---', 'typeId: note', 'fields: {}', '---'].join('\n')];
  const result = validateDatasetSnapshot(snapshot([typeA, typeB]));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === 'E_DUPLICATE_ID'));
});

test('TYPE-001: type object without recordId is valid', () => {
  const type = ['types/note.md', ['---', 'typeId: note', 'fields: {}', '---'].join('\n')];
  const result = validateDatasetSnapshot(snapshot([type]));
  assert.equal(result.ok, true, JSON.stringify(result.errors));
});
