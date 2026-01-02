const assert = require('node:assert/strict');
const test = require('node:test');

const { validateDatasetSnapshot, buildGraphFromSnapshot } = require('../dist/core');

const encoder = new TextEncoder();

function snapshot(entries) {
  return { files: new Map(entries.map(([path, content]) => [path, encoder.encode(content)])) };
}

test('LAYOUT-002: only first front matter block defines a record object', () => {
  const recordContent = [
    '---',
    'typeId: note',
    'recordId: one',
    'fields: {}',
    '---',
    'Body with a second YAML-looking block that must be treated as markdown only.',
    '---',
    'typeId: note',
    'recordId: two',
    'fields: {}',
    '---',
    'Trailing text.',
  ].join('\n');

  const snap = snapshot([
    ['types/note.md', ['---', 'typeId: note', 'fields: {}', '---', ''].join('\n')],
    ['records/multi.md', recordContent],
  ]);

  const validation = validateDatasetSnapshot(snap);
  assert.equal(validation.ok, true, JSON.stringify(validation.errors));

  const graphResult = buildGraphFromSnapshot(snap);
  assert.equal(graphResult.ok, true, JSON.stringify(graphResult.errors));
  const { graph } = graphResult;

  assert.ok(graph.getRecord('note:one'));
  assert.equal(graph.getRecord('note:two'), null);
  assert.deepEqual(graph.getLinksFrom('note:one'), []);
});
