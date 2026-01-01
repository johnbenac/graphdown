const assert = require('node:assert/strict');
const test = require('node:test');

const { validateDatasetSnapshot } = require('../dist/core');

const encoder = new TextEncoder();

function snapshot(entries) {
  return { files: new Map(entries.map(([path, content]) => [path, encoder.encode(content)])) };
}

const recordsPlaceholder = ['records/.keep', 'placeholder'];

const engineTypeEntry = [
  'types/engine.md',
  [
    '---',
    'id: type:engine',
    'typeId: sys:type',
    'createdAt: 2024-01-01',
    'updatedAt: 2024-01-02',
    'fields:',
    '  recordTypeId: engine',
    '---',
    'Engine type'
  ].join('\n')
];

const chassisTypeEntry = [
  'types/chassis.md',
  [
    '---',
    'id: type:chassis',
    'typeId: sys:type',
    'createdAt: 2024-01-01',
    'updatedAt: 2024-01-02',
    'fields:',
    '  recordTypeId: chassis',
    '---',
    'Chassis type'
  ].join('\n')
];

const carTypeWithComposition = [
  'types/car.md',
  [
    '---',
    'id: type:car',
    'typeId: sys:type',
    'createdAt: 2024-01-01',
    'updatedAt: 2024-01-02',
    'fields:',
    '  recordTypeId: car',
    '  composition:',
    '    engine:',
    '      recordTypeId: engine',
    '      min: 1',
    '      max: 1',
    '    chassis:',
    '      recordTypeId: chassis',
    '      min: 1',
    '---',
    'Car type'
  ].join('\n')
];

const engineRecord = [
  'records/engine/engine-1.md',
  [
    '---',
    'id: engine:1',
    'typeId: engine',
    'createdAt: 2024-01-03',
    'updatedAt: 2024-01-04',
    'fields:',
    '  name: Engine',
    '---',
    'Engine'
  ].join('\n')
];

const chassisRecord = [
  'records/chassis/chassis-1.md',
  [
    '---',
    'id: chassis:1',
    'typeId: chassis',
    'createdAt: 2024-01-03',
    'updatedAt: 2024-01-04',
    'fields:',
    '  name: Chassis',
    '---',
    'Chassis'
  ].join('\n')
];

test('VAL-COMP-002: composition passes when required components are linked via wiki-links', () => {
  const carRecord = [
    'records/car/car-1.md',
    [
      '---',
      'id: car:1',
      'typeId: car',
      'createdAt: 2024-01-03',
      'updatedAt: 2024-01-04',
      'fields:',
      '  name: Car',
      '  parts:',
      '    - "[[engine:1]]"',
      '    - "[[chassis:1]]"',
      '---',
      'Car'
    ].join('\n')
  ];

  const result = validateDatasetSnapshot(
    snapshot([carTypeWithComposition, engineTypeEntry, chassisTypeEntry, engineRecord, chassisRecord, carRecord])
  );

  assert.equal(result.ok, true);
});

test('VAL-COMP-002: composition fails when required component links are missing', () => {
  const carRecordMissing = [
    'records/car/car-1.md',
    [
      '---',
      'id: car:1',
      'typeId: car',
      'createdAt: 2024-01-03',
      'updatedAt: 2024-01-04',
      'fields:',
      '  name: Car',
      '  parts:',
      '    - "[[engine:1]]"',
      '---',
      'Car'
    ].join('\n')
  ];

  const result = validateDatasetSnapshot(
    snapshot([carTypeWithComposition, engineTypeEntry, chassisTypeEntry, engineRecord, chassisRecord, carRecordMissing])
  );

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === 'E_COMPOSITION_CONSTRAINT_VIOLATION'));
});

test('VAL-COMP-002: composition ignores links that resolve to the wrong type', () => {
  const personType = [
    'types/person.md',
    [
      '---',
      'id: type:person',
      'typeId: sys:type',
      'createdAt: 2024-01-01',
      'updatedAt: 2024-01-02',
      'fields:',
      '  recordTypeId: person',
      '---',
      'Person type'
    ].join('\n')
  ];

  const personRecord = [
    'records/person/person-1.md',
    [
      '---',
      'id: person:1',
      'typeId: person',
      'createdAt: 2024-01-03',
      'updatedAt: 2024-01-04',
      'fields:',
      '  name: Alice',
      '---',
      'Person'
    ].join('\n')
  ];

  const carRecordWrongType = [
    'records/car/car-1.md',
    [
      '---',
      'id: car:1',
      'typeId: car',
      'createdAt: 2024-01-03',
      'updatedAt: 2024-01-04',
      'fields:',
      '  name: Car',
      '  parts:',
      '    - "[[person:1]]"',
      '---',
      'Car'
    ].join('\n')
  ];

  const result = validateDatasetSnapshot(
    snapshot([
      carTypeWithComposition,
      engineTypeEntry,
      chassisTypeEntry,
      personType,
      engineRecord,
      chassisRecord,
      personRecord,
      carRecordWrongType
    ])
  );

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === 'E_COMPOSITION_CONSTRAINT_VIOLATION'));
});

test('TYPE-COMP-001: composition schema rejects non-map composition shapes', () => {
  const carTypeInvalid = [
    'types/car.md',
    [
      '---',
      'id: type:car',
      'typeId: sys:type',
      'createdAt: 2024-01-01',
      'updatedAt: 2024-01-02',
      'fields:',
      '  recordTypeId: car',
      '  composition: []',
      '---',
      'Car type'
    ].join('\n')
  ];

  const result = validateDatasetSnapshot(snapshot([carTypeInvalid, recordsPlaceholder]));

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === 'E_COMPOSITION_SCHEMA_INVALID'));
});

test('TYPE-COMP-001: composition schema rejects null composition', () => {
  const carTypeNull = [
    'types/car.md',
    [
      '---',
      'id: type:car',
      'typeId: sys:type',
      'createdAt: 2024-01-01',
      'updatedAt: 2024-01-02',
      'fields:',
      '  recordTypeId: car',
      '  composition: null',
      '---',
      'Car type'
    ].join('\n')
  ];

  const result = validateDatasetSnapshot(snapshot([carTypeNull, recordsPlaceholder]));

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === 'E_COMPOSITION_SCHEMA_INVALID'));
});

test('VAL-COMP-001: composition references must point at existing types', () => {
  const carTypeUnknownComponent = [
    'types/car.md',
    [
      '---',
      'id: type:car',
      'typeId: sys:type',
      'createdAt: 2024-01-01',
      'updatedAt: 2024-01-02',
      'fields:',
      '  recordTypeId: car',
      '  composition:',
      '    flux:',
      '      recordTypeId: flux-capacitor',
      '---',
      'Car type'
    ].join('\n')
  ];

  const result = validateDatasetSnapshot(snapshot([carTypeUnknownComponent, recordsPlaceholder]));

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === 'E_COMPOSITION_UNKNOWN_TYPE'));
});

test('REL-007: structured {ref} objects do not satisfy composition requirements', () => {
  const carRecordStructuredRef = [
    'records/car/car-1.md',
    [
      '---',
      'id: car:1',
      'typeId: car',
      'createdAt: 2024-01-03',
      'updatedAt: 2024-01-04',
      'fields:',
      '  name: Car',
      '  parts:',
      '    - ref: engine:1',
      '---',
      'Car'
    ].join('\n')
  ];

  const result = validateDatasetSnapshot(
    snapshot([carTypeWithComposition, engineTypeEntry, chassisTypeEntry, engineRecord, chassisRecord, carRecordStructuredRef])
  );

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === 'E_COMPOSITION_CONSTRAINT_VIOLATION'));
});

test('VAL-COMP-002: duplicate links to the same target do not satisfy higher mins', () => {
  const carTypeMinTwo = [
    'types/car.md',
    [
      '---',
      'id: type:car',
      'typeId: sys:type',
      'createdAt: 2024-01-01',
      'updatedAt: 2024-01-02',
      'fields:',
      '  recordTypeId: car',
      '  composition:',
      '    engine:',
      '      recordTypeId: engine',
      '      min: 2',
      '---',
      'Car type'
    ].join('\n')
  ];

  const carRecordWithDuplicates = [
    'records/car/car-1.md',
    [
      '---',
      'id: car:1',
      'typeId: car',
      'createdAt: 2024-01-03',
      'updatedAt: 2024-01-04',
      'fields:',
      '  name: Car',
      '  links:',
      '    - "[[engine:1]]"',
      '    - "[[engine:1]]"',
      '---',
      'Car'
    ].join('\n')
  ];

  const result = validateDatasetSnapshot(
    snapshot([carTypeMinTwo, engineTypeEntry, engineRecord, carRecordWithDuplicates])
  );

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === 'E_COMPOSITION_CONSTRAINT_VIOLATION'));
});

test('LAYOUT-004: nested type and record paths are accepted', () => {
  const nestedType = [
    'types/2024/subdir/type--car.md',
    [
      '---',
      'id: type:car',
      'typeId: sys:type',
      'createdAt: 2024-01-01',
      'updatedAt: 2024-01-02',
      'fields:',
      '  recordTypeId: car',
      '  composition:',
      '    engine:',
      '      recordTypeId: engine',
      '---',
      'Car type'
    ].join('\n')
  ];

  const nestedEngineType = [
    'types/2024/type--engine.md',
    [
      '---',
      'id: type:engine',
      'typeId: sys:type',
      'createdAt: 2024-01-01',
      'updatedAt: 2024-01-02',
      'fields:',
      '  recordTypeId: engine',
      '---',
      'Engine type'
    ].join('\n')
  ];

  const engineInSubdir = [
    'records/engine/2024/engine-1.md',
    [
      '---',
      'id: engine:1',
      'typeId: engine',
      'createdAt: 2024-01-03',
      'updatedAt: 2024-01-04',
      'fields:',
      '  name: Engine',
      '---',
      'Engine'
    ].join('\n')
  ];

  const carInSubdir = [
    'records/car/2024/car-1.md',
    [
      '---',
      'id: car:1',
      'typeId: car',
      'createdAt: 2024-01-03',
      'updatedAt: 2024-01-04',
      'fields:',
      '  name: Car',
      '  part: "[[engine:1]]"',
      '---',
      'Car'
    ].join('\n')
  ];

  const result = validateDatasetSnapshot(
    snapshot([nestedType, nestedEngineType, engineInSubdir, carInSubdir])
  );

  assert.equal(result.ok, true);
});
