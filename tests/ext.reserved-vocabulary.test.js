const assert = require('node:assert/strict');
const test = require('node:test');

const { validateDatasetSnapshot } = require('../dist/core');

const encoder = new TextEncoder();

function snapshot(entries) {
  return { files: new Map(entries.map(([path, content]) => [path, encoder.encode(content)])) };
}

test('EXT-001: extra top-level keys are forbidden', () => {
  const typeEntry = [
    'types/widget.md',
    [
      '---',
      'typeId: widget',
      'fields: {}',
      'notes: custom type metadata',
      '---',
      'Widget type'
    ].join('\n')
  ];

  const recordEntry = [
    'records/widget-1.md',
    [
      '---',
      'typeId: widget',
      'recordId: one',
      'fields: {}',
      'source: importer',
      '---',
      'Widget record'
    ].join('\n')
  ];

  const result = validateDatasetSnapshot(snapshot([typeEntry, recordEntry]));

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === 'E_FORBIDDEN_TOP_LEVEL_KEY'));
});

test('EXT-002: accepts arbitrary shapes within fields', () => {
  const typeEntry = [
    'types/gizmo.md',
    [
      '---',
      'typeId: gizmo',
      'fields: {}',
      '---',
      'Gizmo type'
    ].join('\n')
  ];

  const recordEntry = [
    'records/gizmo/gizmo-1.md',
    [
      '---',
      'typeId: gizmo',
      'recordId: one',
      'fields:',
      '  name: Gizmo One',
      '  count: 3',
      '  active: true',
      '  nothing: null',
      '  tags:',
      '    - alpha',
      '    - 2',
      '    - { nested: yes }',
      '  metadata:',
      '    owner: qa',
      '    notes:',
      '      - { label: first, score: 10 }',
      '      - { label: second, score: 20 }',
      '---',
      'Gizmo record'
    ].join('\n')
  ];

  const result = validateDatasetSnapshot(snapshot([typeEntry, recordEntry]));

  assert.equal(result.ok, true, JSON.stringify(result.errors));
});
