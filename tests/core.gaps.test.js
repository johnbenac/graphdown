const assert = require('node:assert/strict');
const test = require('node:test');

const { validateDatasetSnapshot } = require('../dist/core');

const encoder = new TextEncoder();

function snapshot(entries) {
  return { files: new Map(entries.map(([path, content]) => [path, encoder.encode(content)])) };
}

const recordsPlaceholder = ['records/.keep', 'placeholder'];

const typeNote = [
  'types/type--note.md',
  [
    '---',
    'id: type:note',
    'typeId: sys:type',
    'createdAt: 2024-01-01',
    'updatedAt: 2024-01-02',
    'fields:',
    '  recordTypeId: note',
    '---',
    'Type body'
  ].join('\n')
];

test('NR-LINK-001: missing link targets do not fail validation', () => {
  const recordWithMissingLink = [
    'records/note/note-1.md',
    [
      '---',
      'id: note:1',
      'typeId: note',
      'createdAt: 2024-01-03',
      'updatedAt: 2024-01-04',
      'fields: {}',
      '---',
      'See [[note:missing]]'
    ].join('\n')
  ];

  const result = validateDatasetSnapshot(snapshot([typeNote, recordWithMissingLink]));
  assert.equal(result.ok, true, JSON.stringify(result.errors));
});

test('TYPE-005: fieldDefs must declare kind', () => {
  const typeMissingKind = [
    'types/type--device.md',
    [
      '---',
      'id: type:device',
      'typeId: sys:type',
      'createdAt: 2024-01-01',
      'updatedAt: 2024-01-02',
      'fields:',
      '  recordTypeId: device',
      '  fieldDefs:',
      '    name:',
      '      required: true',
      '---',
      'Device type'
    ].join('\n')
  ];

  const result = validateDatasetSnapshot(snapshot([typeMissingKind, recordsPlaceholder]));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === 'E_REQUIRED_FIELD_MISSING'));
});

test('TYPE-006: unknown kinds are accepted', () => {
  const typeUnknownKind = [
    'types/type--sensor.md',
    [
      '---',
      'id: type:sensor',
      'typeId: sys:type',
      'createdAt: 2024-01-01',
      'updatedAt: 2024-01-02',
      'fields:',
      '  recordTypeId: sensor',
      '  fieldDefs:',
      '    signal:',
      '      kind: smoke-signal',
      '---',
      'Sensor type'
    ].join('\n')
  ];

  const result = validateDatasetSnapshot(snapshot([typeUnknownKind, recordsPlaceholder]));
  assert.equal(result.ok, true, JSON.stringify(result.errors));
});

test('TYPE-007: bodyField is optional', () => {
  const typeWithoutBodyField = typeNote;
  const typeWithBodyField = [
    'types/type--note.md',
    [
      '---',
      'id: type:note',
      'typeId: sys:type',
      'createdAt: 2024-01-01',
      'updatedAt: 2024-01-02',
      'fields:',
      '  recordTypeId: note',
      '  bodyField: body',
      '---',
      'Type body'
    ].join('\n')
  ];

  const record = [
    'records/note/note-1.md',
    [
      '---',
      'id: note:1',
      'typeId: note',
      'createdAt: 2024-01-03',
      'updatedAt: 2024-01-04',
      'fields:',
      '  title: Note',
      '---',
      'Body'
    ].join('\n')
  ];

  const resultNoBodyField = validateDatasetSnapshot(snapshot([typeWithoutBodyField, record]));
  const resultWithBodyField = validateDatasetSnapshot(snapshot([typeWithBodyField, record]));

  assert.equal(resultNoBodyField.ok, true, JSON.stringify(resultNoBodyField.errors));
  assert.equal(resultWithBodyField.ok, true, JSON.stringify(resultWithBodyField.errors));
});

test('VAL-006: semantic constraints are not enforced', () => {
  const typeWithKind = [
    'types/type--flag.md',
    [
      '---',
      'id: type:flag',
      'typeId: sys:type',
      'createdAt: 2024-01-01',
      'updatedAt: 2024-01-02',
      'fields:',
      '  recordTypeId: flag',
      '  fieldDefs:',
      '    enabled:',
      '      kind: boolean',
      '      required: true',
      '---',
      'Flag type'
    ].join('\n')
  ];

  const recordWithNonBoolean = [
    'records/flag/flag-1.md',
    [
      '---',
      'id: flag:1',
      'typeId: flag',
      'createdAt: 2024-01-03',
      'updatedAt: 2024-01-04',
      'fields:',
      '  enabled: "not a boolean"',
      '---',
      'Body'
    ].join('\n')
  ];

  const result = validateDatasetSnapshot(snapshot([typeWithKind, recordWithNonBoolean]));
  assert.equal(result.ok, true, JSON.stringify(result.errors));
});

test('NR-UI-002: UI hint keys are ignored by validation', () => {
  const typeWithUiHints = [
    'types/type--note.md',
    [
      '---',
      'id: type:note',
      'typeId: sys:type',
      'createdAt: 2024-01-01',
      'updatedAt: 2024-01-02',
      'fields:',
      '  recordTypeId: note',
      '  fieldDefs:',
      '    title:',
      '      kind: string',
      '---',
      'Type body'
    ].join('\n')
  ];

  const recordWithUiHints = [
    'records/note/note-1.md',
    [
      '---',
      'id: note:1',
      'typeId: note',
      'createdAt: 2024-01-03',
      'updatedAt: 2024-01-04',
      'fields:',
      '  title: Note',
      '  ui:',
      '    widget: textarea',
      '    label: "Fancy Title"',
      '---',
      'Body'
    ].join('\n')
  ];

  const result = validateDatasetSnapshot(snapshot([typeWithUiHints, recordWithUiHints]));
  assert.equal(result.ok, true, JSON.stringify(result.errors));
});
