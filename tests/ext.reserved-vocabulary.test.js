const assert = require('node:assert/strict');
const test = require('node:test');

const { validateDatasetSnapshot } = require('../dist/core');

const encoder = new TextEncoder();

function snapshot(entries) {
  return { files: new Map(entries.map(([path, content]) => [path, encoder.encode(content)])) };
}

const recordsPlaceholder = ['records/.keep', 'placeholder'];

test('EXT-001: allows arbitrary extra top-level keys on types and records', () => {
  const typeEntry = [
    'types/widget.md',
    [
      '---',
      'id: type:widget',
      'typeId: sys:type',
      'createdAt: 2024-01-01',
      'updatedAt: 2024-01-02',
      'schemaVersion: 3',
      'notes: custom type metadata',
      'fields:',
      '  recordTypeId: widget',
      '  displayName: Widget',
      '---',
      'Widget type'
    ].join('\n')
  ];

  const recordEntry = [
    'records/widget/widget-1.md',
    [
      '---',
      'id: widget:1',
      'typeId: widget',
      'createdAt: 2024-01-03',
      'updatedAt: 2024-01-04',
      'source: importer',
      'metadata:',
      '  owner: ops-team',
      'fields:',
      '  name: Widget 1',
      '  status: active',
      '---',
      'Widget record'
    ].join('\n')
  ];

  const result = validateDatasetSnapshot(snapshot([typeEntry, recordEntry, recordsPlaceholder]));

  assert.equal(result.ok, true, JSON.stringify(result.errors));
});
