const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { buildGraphFromFs } = require('../dist/core');

function writeFile(root, relative, content) {
  const full = path.join(root, relative);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

function typeFile(typeId) {
  return ['---', `typeId: ${typeId}`, 'fields: {}', '---', ''].join('\n');
}

function recordFile(typeId, recordId, body = '', extraFields = '') {
  return ['---', `typeId: ${typeId}`, `recordId: ${recordId}`, 'fields: {}', extraFields, '---', body].join('\n');
}

test('REL-002/REL-003: extracts record links from bodies and fields', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graphdown-graph-'));
  try {
    writeFile(tempDir, 'types/note.md', typeFile('note'));
    writeFile(tempDir, 'records/note-1.md', recordFile('note', 'one', 'See [[note:two]].'));
    writeFile(
      tempDir,
      'records/note-2.md',
      ['---', 'typeId: note', 'recordId: two', 'fields:', '  ref: "[[note:one]]"', '---', 'Backlink'].join('\n')
    );

    const result = buildGraphFromFs(tempDir);
    assert.equal(result.ok, true);
    const { graph } = result;
    assert.deepEqual(graph.getLinksFrom('note:one'), ['note:two']);
    assert.deepEqual(graph.getLinksTo('note:one'), ['note:two']);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('Graph exposes type and record lookup by identity', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graphdown-graph-'));
  try {
    writeFile(tempDir, 't.md', typeFile('note'));
    writeFile(tempDir, 'r.md', recordFile('note', 'one'));

    const result = buildGraphFromFs(tempDir);
    assert.equal(result.ok, true);
    const { graph } = result;
    const type = graph.getType('note');
    assert.ok(type);
    const record = graph.getRecord('note:one');
    assert.ok(record);
    assert.equal(graph.getTypeForRecord('note:one')?.typeId, 'note');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('VAL-002: duplicate record identity fails graph build', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graphdown-graph-'));
  try {
    writeFile(tempDir, 't.md', typeFile('note'));
    const content = recordFile('note', 'one');
    writeFile(tempDir, 'r1.md', content);
    writeFile(tempDir, 'r2.md', content);

    const result = buildGraphFromFs(tempDir);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.code === 'E_DUPLICATE_ID'));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
